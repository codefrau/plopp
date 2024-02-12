/*
 * Plopp Socket Plugin
 *
 * This plugin intercepts Plopp's "send ecard" http requests
 * to planet-plopp.com/ploppcardmailer and uses the fetch API
 * to send them to the server.
 */

function SocketPlugin() {
    "use strict";

    const Resolver_Ready = 1;
    const Unconnected = 0;
    const Connected = 2;

    return {
        getModuleName: function() { return 'SocketPlugin (plopp)'; },
        interpreterProxy: null,
        primHandler: null,

        setInterpreter: function(proxy) {
            this.interpreterProxy = proxy;
            this.vm = proxy.vm;
            this.primHandler = this.vm.primHandler;
            return true;
        },

        primitiveResolverStatus: function(argCount) {
            const status = Resolver_Ready;
            return this.vm.popNandPush(argCount + 1, status);
        },

        primitiveResolverStartNameLookup: function(argCount) {
            return this.vm.popN(argCount);
        },

        primitiveResolverNameLookupResult: function(argCount) {
            const address = this.primHandler.makeStByteArray([1, 2, 3, 4]);
            return this.vm.popNandPush(argCount + 1, address);
        },

        primitiveSocketCreate3Semaphores: function(argCount) {
            const socket = this.primHandler.makeStString('socket');
            socket.status = Unconnected;
            socket.readSema = this.interpreterProxy.stackIntegerValue(1);
            return this.vm.popNandPush(argCount + 1, socket);
        },

        primitiveSocketConnectionStatus: function(argCount) {
            const socket = this.vm.top();
            return this.vm.popNandPush(argCount + 1, socket.status);
        },

        primitiveSocketConnectToPort: function(argCount) {
            const socket = this.vm.stackValue(2);
            socket.status = Connected;
            socket.response = null;
            return this.vm.popN(argCount);
        },

        primitiveSocketSendDataBufCount: function(argCount) {
            const socket = this.vm.stackValue(3);
            const data = this.vm.stackValue(2);
            this.sendRequestFromSqueak(socket, data);
            return this.vm.popNandPush(argCount + 1, data.bytesSize());
        },

        primitiveSocketSendDone: function(argCount) {
            return this.vm.popNandPush(argCount + 1, this.vm.trueObj);
        },

        primitiveSocketReceiveDataAvailable: function(argCount) {
            const socket = this.vm.top();
            const available = socket.response ? this.vm.trueObj : this.vm.falseObj;
            return this.vm.popNandPush(argCount + 1, available);
        },

        primitiveSocketCloseConnection: function(argCount) {
            const socket = this.vm.top();
            socket.status = Unconnected;
            return this.vm.popN(argCount);
        },

        primitiveSocketReceiveDataBufCount: function(argCount) {
            const socket = this.vm.stackValue(3);
            const response = socket.response;
            if (!response) return false;
            const target = this.interpreterProxy.stackObjectValue(2);
            target.bytes.set(response);
            const count = Math.min(target.bytesSize(), response.length);
            if (count < response.length) {
                socket.response = response.subarray(count);
            } else {
                socket.response = null;
            }
            return this.vm.popNandPush(argCount + 1, count);
        },

        primitiveSocketDestroy: function(argCount) {
            const socket = this.vm.top();
            socket.status = Unconnected;
            return this.vm.popN(argCount);
        },

        sendRequestFromSqueak: function(socket, data) {
            // extract request and body from data so we can use fetch
            const request = data.bytesAsString().split('\r\n\r\n', 1)[0];
            const body = data.bytes.subarray(request.length + 4);
            const requestLines = request.split('\r\n');
            const [method, path] = requestLines[0].split(' ', 2);
            let headers = {};
            let host;
            for (let i = 1; i < requestLines.length; i++) {
                const line = requestLines[i];
                const colon = line.indexOf(':');
                const key = line.substring(0, colon).trim();
                const value = line.substring(colon + 1).trim();
                headers[key] = value;
                if (key === 'Host') host = value;
            }
            const url = 'http://' + host + path;
            console.log(`Sending: ${method} to ${url}`, headers, body);
            fetch(url, { method, headers, body })
            .then(response => {
                console.log('ecard response:', response.status, response.statusText);
                response.text().then(body => {
                    console.log(body);
                    this.deliverResponseToSqueak(socket, response, body);
                });
            })
            .catch(error => {
                console.error('Send error:', error.message);
                const statusText = `SqueakJS HTTP ${method} Error (CORS?)`;
                this.deliverResponseToSqueak(socket, { status: 500, statusText }, statusText);
            });
        },

        deliverResponseToSqueak: function(socket, response, body) {
            const headers = response.headers || new Map();
            const responseString = `HTTP/1.1 ${response.status} ${response.statusText}\r\n` +
                Array.from(headers.entries()).map(([key, value]) => `${key}: ${value}`).join('\r\n') +
                '\r\n\r\n' + body;
            socket.response = new Uint8Array(responseString.length);
            for (let i = 0; i < responseString.length; i++) {
                socket.response[i] = responseString.charCodeAt(i);
            }
            this.primHandler.signalSemaphoreWithIndex(socket.readSema);
        }
    }
}

function registerSocketPlugin() {
    if (typeof Squeak === "object" && Squeak.registerExternalModule) {
        Squeak.registerExternalModule('SocketPlugin', SocketPlugin());
    } else self.setTimeout(registerSocketPlugin, 100);
};

registerSocketPlugin();
