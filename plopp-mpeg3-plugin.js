// fake Mpeg3Plugin, we play videos as overlay in the browser
// hardcoded to play videos at 800x600, 25fps

function PloppMpeg3Plugin() {
    "use strict";

    return {
        getModuleName: function () { return 'Mpeg3Plugin'; },
        interpreterProxy: null,
        primHandler: null,
        vm: null,

        setInterpreter: function (anInterpreter) {
            this.interpreterProxy = anInterpreter;
            this.vm = this.interpreterProxy.vm;
            this.primHandler = this.vm.primHandler;
            return true;
        },

        primitiveMPEG3CheckSig: function (argCount) {
            return this.primHandler.popNandPushBoolIfOK(argCount + 1, true);
        },

        primitiveMPEG3Open: function (argCount) {
            var pathObj = this.interpreterProxy.stackObjectValue(0);
            var path = pathObj.bytesAsString();
            // hack to find mp4 in Plopp directory
            path = path.replace(/.*\/Plopp\//, "");
            path = path.replace(/\.mpg$/, ".mp4");
            // create video element
            var video = document.createElement("video");
            video.src = path;
            video.playsInline = true; // Safari
            document.body.appendChild(video);
            // create handle
            var handle = this.primHandler.makeStString("squeakjs-mpeg:" + path);
            handle.video = video;
            // freeze VM until video is actually playing
            // which may need a user gesture
            var button = document.getElementById("continue");
            button.style.display = "block";
            button.onclick = function() { video.play(); };
            document.body.appendChild(button);
            try {
                // this works in Chrome and Firefox
                video.play();
                // once playing, we'll remove the button
                // on Safari, user will have to click it
            } catch (err) {};
            this.vm.freeze(function(unfreeze) {
                video.addEventListener('timeupdate',
                    function () {
                        if (video.currentTime < 0.1) return; // not playing yet
                        button.style.display = "none";
                        if (!unfreeze) return; // already failed or started
                        console.log("primitiveMPEG3Open: " + video.videoWidth + "x" + video.videoHeight + ", " + video.duration + "s " + video.src);
                        // continue
                        unfreeze();
                        unfreeze = null; // don't unfreeze twice
                    },
                );
                video.onerror = function (err) {
                    if (!unfreeze) return; // too late
                    console.error("primitiveMPEG3Open: error", err);
                    unfreeze();
                    unfreeze = null; // don't unfreeze twice
                };
            }.bind(this));
            // the primitive will succeeed now, but then the VM
            // will pause execution until unfreeze() is called
            this.interpreterProxy.popthenPush(argCount + 1, handle);
            return true;
        },

        videoFromStackArg: function (n) {
            var handle = this.interpreterProxy.stackObjectValue(n);
            if (this.interpreterProxy.failed()) return null;
            return handle.video;
        },

        primitiveMPEG3HasAudio: function (argCount) {
            return this.primHandler.popNandPushBoolIfOK(argCount + 1, false);
        },

        primitiveMPEG3HasVideo: function (argCount) {
            return this.primHandler.popNandPushBoolIfOK(argCount + 1, true);
        },

        primitiveMPEG3TotalVStreams: function (argCount) {
            return this.primHandler.popNandPushIntIfOK(argCount + 1, 1);
        },

        primitiveMPEG3FrameRate: function (argCount) {
            return this.primHandler.popNandPushIntIfOK(argCount + 1, 25);
        },

        primitiveMPEG3VideoWidth: function (argCount) {
            return this.primHandler.popNandPushIntIfOK(argCount + 1, 800);
        },

        primitiveMPEG3VideoHeight: function (argCount) {
            return this.primHandler.popNandPushIntIfOK(argCount + 1, 600);
        },

        primitiveMPEG3ReadFrame: function (argCount) {
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveMPEG3GetFrame: function (argCount) {
            var video = this.videoFromStackArg(1);
            if (!video) return false;
            var frame = Math.floor(video.currentTime * 25);
            // var frames = Math.floor(video.duration * 25);
            // console.log("frame", frame, "of", frames);
            return this.primHandler.popNandPushIntIfOK(argCount + 1, frame);
        },

        primitiveMPEG3VideoFrames: function (argCount) {
            var video = this.videoFromStackArg(1);
            if (!video) return false;
            var frames = Math.floor(video.duration * 25);
            return this.primHandler.popNandPushIntIfOK(argCount + 1, frames);
        },

        primitiveMPEG3SetFrame: function (argCount) {
            var video = this.videoFromStackArg(2);
            if (!video) return false;
            var frame = this.interpreterProxy.stackIntegerValue(1);
            video.currentTime = frame / 25;
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveMPEG3DropFrames: function (argCount) {
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveMPEG3ReadFrameBufferOffset: function (argCount) {
            return this.primHandler.popNandPushIntIfOK(argCount + 1, 0);
        },

        primitiveMPEG3EndOfVideo: function (argCount) {
            var video = this.videoFromStackArg(1);
            if (!video) return false;
            // console.log("primitiveMPEG3EndOfVideo:", video.ended);
            return this.primHandler.popNandPushBoolIfOK(argCount + 1, video.ended);
        },

        primitiveMPEG3Close: function (argCount) {
            var video = this.videoFromStackArg(0);
            if (!video) return false;
            video.pause();
            video.remove();
            console.log("primitiveMPEG3Close", video.src);
            this.interpreterProxy.pop(argCount);
            return true;
        },
    };
}

document.addEventListener("DOMContentLoaded", function () {
    Squeak.registerExternalModule('Mpeg3Plugin', PloppMpeg3Plugin());
}, false);