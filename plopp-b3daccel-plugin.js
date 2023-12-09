function B3DAcceleratorPlugin() {
    "use strict";

    return {
        getModuleName: function () { return 'B3DAcceleratorPlugin'; },
        interpreterProxy: null,
        primHandler: null,

        webglContext: null, // accessed by OpenGL plugin

        setInterpreter: function (anInterpreter) {
            this.interpreterProxy = anInterpreter;
            this.primHandler = this.interpreterProxy.vm.primHandler;
            return true;
        },

        primitiveSetVerboseLevel: function (argCount) {
            if (argCount !== 1) return false;
            var level = this.interpreterProxy.stackIntegerValue(0);
            console.log("B3DAccel: primitiveSetVerboseLevel", level);
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveCreateRendererFlags: function (argCount) {
            if (argCount !== 5) return false;
            var h = this.interpreterProxy.stackIntegerValue(0);
            var w = this.interpreterProxy.stackIntegerValue(1);
            var y = this.interpreterProxy.stackIntegerValue(2);
            var x = this.interpreterProxy.stackIntegerValue(3);
            var flags = this.interpreterProxy.stackIntegerValue(4);
            console.log("B3DAccel: primitiveCreateRendererFlags", x, y, w, h, flags);
            // create WebGL canvas
            var canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            canvas.style.position = "absolute";
            canvas.style.backgroundColor = "transparent";
            document.body.appendChild(canvas);
            var context = canvas.getContext("webgl");
            if (!context) return false;
            // set context globally for OpenGL plugin
            this.webglContext = context;
            // create handle
            var handle = this.primHandler.makeStString("WebGL(" + x + "," + y + "," + w + "," + h + ")");
            handle.canvas = canvas;
            handle.context = context;
            return this.primHandler.popNandPushIfOK(argCount + 1, handle);
        },

        primitiveDestroyRenderer: function (argCount) {
            if (argCount !== 1) return false;
            var handle = this.interpreterProxy.stackIntegerValue(0);
            console.log("B3DAccel: primitiveDestroyRenderer", handle);
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveGetRendererSurfaceHandle: function (argCount) {
            if (argCount !== 1) return false;
            var handle = this.interpreterProxy.stackIntegerValue(0);
            console.log("B3DAccel: primitiveGetRendererSurfaceHandle", handle);
            var surface = 4242;
            return this.primHandler.popNandPushIfOK(argCount + 1, surface);
        },

        primitiveGetIntProperty: function (argCount) {
            if (argCount !== 2) return false;
            var property = this.interpreterProxy.stackIntegerValue(0);
            var handle = this.interpreterProxy.stackIntegerValue(1);
            console.log("B3DAccel: primitiveGetIntProperty", handle, property);
            var value = 424242;
            return this.primHandler.popNandPushIfOK(argCount + 1, value);
        },

        primitiveGetRendererSurfaceWidth: function (argCount) {
            if (argCount !== 1) return false;
            var handle = this.interpreterProxy.stackIntegerValue(0);
            var width = 800;
            console.log("B3DAccel: primitiveGetRendererSurfaceWidth", width);
            return this.primHandler.popNandPushIfOK(argCount + 1, width);
        },

        primitiveGetRendererSurfaceHeight: function (argCount) {
            if (argCount !== 1) return false;
            var handle = this.interpreterProxy.stackIntegerValue(0);
            var height = 600;
            console.log("B3DAccel: primitiveGetRendererSurfaceHeight", height);
            return this.primHandler.popNandPushIfOK(argCount + 1, height);
        },

        primitiveGetRendererSurfaceDepth: function (argCount) {
            if (argCount !== 1) return false;
            var handle = this.interpreterProxy.stackIntegerValue(0);
            var depth = 32;
            console.log("B3DAccel: primitiveGetRendererSurfaceDepth", depth);
            return this.primHandler.popNandPushIfOK(argCount + 1, depth);
        },

        primitiveGetRendererColorMasks: function (argCount) {
            if (argCount !== 2) return false;
            var array = this.interpreterProxy.stackObjectValue(0);
            var handle = this.interpreterProxy.stackIntegerValue(1);
            if (array.pointersSize() !== 4) return false;
            var masks = [0x00FF0000, 0x0000FF00, 0x000000FF, 0xFF000000];
            for (var i = 0; i < 4; i++) {
                array.pointers[i] = this.interpreterProxy.positive32BitIntegerFor(masks[i]);
            }
            console.log("B3DAccel: primitiveGetRendererColorMasks", masks);
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveSetViewport: function (argCount) {
            if (argCount !== 5) return false;
            var h = this.interpreterProxy.stackIntegerValue(0);
            var w = this.interpreterProxy.stackIntegerValue(1);
            var y = this.interpreterProxy.stackIntegerValue(2);
            var x = this.interpreterProxy.stackIntegerValue(3);
            var handle = this.interpreterProxy.stackIntegerValue(4);
            console.log("B3DAccel: primitiveSetViewport", x, y, w, h);
            this.b3dxSetViewport(handle, x, y, w, h);
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveSetTransform: function (argCount) {
            if (argCount !== 3) return false;
            var handle = this.interpreterProxy.stackIntegerValue(2);
            var modelViewMatrix = this.stackMatrix(1);
            var projectionMatrix = this.stackMatrix(0);
            if (!modelViewMatrix || !projectionMatrix) return false;
            console.log("B3DAccel: primitiveSetTransform", projectionMatrix, modelViewMatrix);
            this.b3dxSetTransform(handle, projectionMatrix, modelViewMatrix);
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveSetLights: function (argCount) {
            if (argCount !== 2) return false;
            var handle = this.interpreterProxy.stackIntegerValue(1);
            var lightArray = this.interpreterProxy.stackObjectValue(0);
            if (this.interpreterProxy.failed()) return false;
            if (!this.b3dxDisableLights(handle)) return false;
            if (!lightArray) return false;
            console.log("B3DAccel: primitiveSetLights", lightArray);
            var lightCount = lightArray.pointersSize();
            for (var i = 0; i < lightCount; i++) {
                var light = this.fetchLightSource(i, lightArray);
                if (!this.b3dxLoadLight(handle, i, light)) return false;
            }
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveSetMaterial: function (argCount) {
            if (argCount !== 2) return false;
            var handle = this.interpreterProxy.stackIntegerValue(1);
            var material = this.stackMaterialValue(0);
            if (!material) return false;
            if (!this.b3dxLoadMaterial(handle, material)) return false;
            this.interpreterProxy.pop(argCount);
            return true;
        },

        b3dxSetViewport: function (handle, x, y, w, h) {
            console.log("B3DAccel: b3dxSetViewport", handle, x, y, w, h);
        },

        b3dxSetTransform: function (handle, projectionMatrix, modelViewMatrix) {
            console.log("B3DAccel: b3dxSetTransform", handle, projectionMatrix, modelViewMatrix);
        },

        b3dxDisableLights: function (handle) {
            console.log("B3DAccel: b3dxDisableLights", handle);
            return true;
        },

        b3dxLoadLight: function (handle, index, light) {
            console.log("B3DAccel: b3dxLoadLight", handle, index, light);
            return true;
        },

        b3dxLoadMaterial: function (handle, material) {
            console.log("B3DAccel: b3dxLoadMaterial", handle, material);
            return true;
        },

        fetchLightSource: function (index, lightArray) {
            var light = lightArray.pointers[index];
            if (!light) return null;
            console.log("B3DAccel: fetchLightSource", index, light);
            return light;
        },

        stackMatrix: function (stackIndex) {
            var m = this.interpreterProxy.stackObjectValue(stackIndex);
            if (!m.words || m.words.length !== 16) return null;
            return m.wordsAsFloat32Array();
        },

        stackMaterialValue: function (stackIndex) {
            var material = this.interpreterProxy.stackObjectValue(stackIndex);
            if (!material) return null;
            console.log("B3DAccel: stackMaterialValue", material);
            return material;
        },

    }
}

function registerB3DAcceleratorPlugin() {
    if (typeof Squeak === "object" && Squeak.registerExternalModule) {
        Squeak.registerExternalModule('B3DAcceleratorPlugin', B3DAcceleratorPlugin());
    } else self.setTimeout(registerB3DAcceleratorPlugin, 100);
};

registerB3DAcceleratorPlugin();
