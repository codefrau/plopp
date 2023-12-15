// Plopp Mpeg3Plugin, we play mp3 and mpg (but use mp4 for mpg)
// hardcoded to pretend we play videos at 800x600, 25fps
// and audio at 44100Hz
// empty video frames are sent to Squeak, videos are shown as overlay in the browser
// silent audio is sent to Squeak, we play directly via browser

var firstTime = true;

function PloppMpeg3Plugin() {
    "use strict";

    return {
        getModuleName: function() { return 'Mpeg3Plugin'; },
        interpreterProxy: null,
        primHandler: null,
        vm: null,

        setInterpreter: function(anInterpreter) {
            this.interpreterProxy = anInterpreter;
            this.vm = this.interpreterProxy.vm;
            this.primHandler = this.vm.primHandler;
            return true;
        },

        primitiveMPEG3CheckSig: function(argCount) {
            // assume any file is valid
            return this.primHandler.popNandPushBoolIfOK(argCount + 1, true);
        },

        primitiveMPEG3Open: function(argCount) {
            var pathObj = this.interpreterProxy.stackObjectValue(0);
            var path = pathObj.bytesAsString();
            // hack to find mp4 in Plopp directory
            path = path.replace(/.*\/Plopp\//, "");
            path = path.replace(/\.mpg$/, ".mp4");
            var isAudio = path.match(/\.mp3$/);
            // create player element
            var player = document.createElement(isAudio ? "audio" : "video");
            player.src = path;
            player.playsInline = true; // Safari
            player.isAudio = isAudio;
            player.isVideo = !isAudio;
            if (player.isVideo) document.body.appendChild(player);
            // create handle
            var handle = this.primHandler.makeStString("squeakjs-mpeg:" + path);
            handle.player = player;
            // freeze VM until player is actually playing
            // which may need a user gesture
            var button;
            if (firstTime) { // only show button once
                button = document.getElementById("continue");
                button.style.display = "block";
                button.style.opacity = 0.01;
                button.style.transition = "opacity 0.5s";
                setTimeout(function() { button.style.opacity = 1; }, 100);
                button.onclick = function() { player.play(); };
                document.body.appendChild(button);
                firstTime = false;
            }
            try {
                // this works in Chrome and Firefox
                player.play();
                // once playing, we'll remove the button
                // on Safari, user will have to click it
            } catch (err) {};
            this.vm.freeze(function(unfreeze) {
                player.addEventListener('timeupdate',
                    function() {
                        if (player.currentTime < 0.1) return; // not playing yet
                        if (!unfreeze) return; // already failed or started
                        console.log("primitiveMPEG3Open: "
                            + (player.isVideo? player.videoWidth + "x" + player.videoHeight + ", " : "")
                            + player.duration + "s " + player.src);
                        // continue
                        if (button) button.style.display = "none";
                        unfreeze();
                        unfreeze = null; // don't unfreeze twice
                    },
                );
                player.onerror = function(err) {
                    if (!unfreeze) return; // too late
                    console.error("primitiveMPEG3Open: error", err);
                    if (button) button.style.display = "none";
                    unfreeze();
                    unfreeze = null; // don't unfreeze twice
                };
            }.bind(this));
            // the primitive will succeeed now, but then the VM
            // will pause execution until unfreeze() is called
            this.interpreterProxy.popthenPush(argCount + 1, handle);
            return true;
        },

        primitiveMPEG3Close: function(argCount) {
            var player = this.playerFromStackArg(0);
            if (!player) return false;
            console.log("primitiveMPEG3Close", player.src);
            player.pause();
            if (player.isVideo) player.remove();
            try {
                player.removeAttribute('src');
                player.load();
            } catch (err) {}
            this.interpreterProxy.pop(argCount);
            return true;
        },

        playerFromStackArg: function(n) {
            var handle = this.interpreterProxy.stackObjectValue(n);
            if (this.interpreterProxy.failed()) return null;
            return handle.player;
        },

        primitiveMPEG3HasAudio: function(argCount) {
            var player = this.playerFromStackArg(0);
            return this.primHandler.popNandPushBoolIfOK(argCount + 1, player && player.isAudio);
        },

        primitiveMPEG3HasVideo: function(argCount) {
            var player = this.playerFromStackArg(0);
            return this.primHandler.popNandPushBoolIfOK(argCount + 1, player && player.isVideo);
        },

        //////////// VIDEO /////////////

        primitiveMPEG3TotalVStreams: function(argCount) {
            var player = this.playerFromStackArg(0);
            return this.primHandler.popNandPushIntIfOK(argCount + 1, player && player.isVideo ? 1 : 0);
        },

        primitiveMPEG3FrameRate: function(argCount) {
            return this.primHandler.popNandPushIntIfOK(argCount + 1, 25);
        },

        primitiveMPEG3VideoWidth: function(argCount) {
            return this.primHandler.popNandPushIntIfOK(argCount + 1, 800);
        },

        primitiveMPEG3VideoHeight: function(argCount) {
            return this.primHandler.popNandPushIntIfOK(argCount + 1, 600);
        },

        primitiveMPEG3ReadFrame: function(argCount) {
            // console.log("primitiveMPEG3ReadFrame");
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveMPEG3GetFrame: function(argCount) {
            var player = this.playerFromStackArg(1);
            if (!player) return false;
            var frame = Math.floor(player.currentTime * 25);
            var frames = Math.floor(player.duration * 25);
            // console.log("primitiveMPEG3GetFrame", frame, "of", frames);
            if (frame >= frames) frame = frames - 1;
            return this.primHandler.popNandPushIntIfOK(argCount + 1, frame);
        },

        primitiveMPEG3VideoFrames: function(argCount) {
            var player = this.playerFromStackArg(1);
            if (!player) return false;
            var frames = Math.floor(player.duration * 25);
            // console.log("primitiveMPEG3VideoFrames", frames);
            return this.primHandler.popNandPushIntIfOK(argCount + 1, frames);
        },

        primitiveMPEG3SetFrame: function(argCount) {
            var player = this.playerFromStackArg(2);
            if (!player) return false;
            var frame = this.interpreterProxy.stackIntegerValue(1);
            // player.currentTime = frame / 25;
            console.log("IGNORING primitiveMPEG3SetFrame", frame, "(current time is", player.currentTime, ")");
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveMPEG3DropFrames: function(argCount) {
            var count = this.interpreterProxy.stackIntegerValue(1);
            // console.log("primitiveMPEG3DropFrames", count);
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveMPEG3ReadFrameBufferOffset: function(argCount) {
            return this.primHandler.popNandPushIntIfOK(argCount + 1, 0);
        },

        primitiveMPEG3EndOfVideo: function(argCount) {
            var player = this.playerFromStackArg(1);
            if (!player) return false;
            // console.log("primitiveMPEG3EndOfVideo:", player.ended);
            return this.primHandler.popNandPushBoolIfOK(argCount + 1, player.ended);
        },

        //////////// AUDIO /////////////

        primitiveMPEG3AudioChannels: function(argCount) {
            // console.log("primitiveMPEG3AudioChannels", 1);
            // Plopp audio is always mono
            // but even if it was stereo - we're not sending samples to Squeak
            // so it doesn't matter
            return this.primHandler.popNandPushIntIfOK(argCount + 1, 1);
        },

        primitiveMPEG3SampleRate: function(argCount) {
            // console.log("primitiveMPEG3SampleRate", 44100);
            return this.primHandler.popNandPushIntIfOK(argCount + 1, 44100);
        },

        primitiveMPEG3GetSample: function(argCount) {
            var player = this.playerFromStackArg(1);
            if (!player) return false;
            var sample = Math.floor(player.currentTime * 44100);
            var samples = Math.floor(player.duration * 44100);
            // console.log("primitiveMPEG3GetSample", sample, "of", samples);
            if (sample >= samples) sample = samples - 1;
            return this.primHandler.popNandPushIntIfOK(argCount + 1, sample);
        },

        primitiveMPEG3AudioSamples: function(argCount) {
            var player = this.playerFromStackArg(1);
            if (!player) return false;
            var samples = Math.floor(player.duration * 44100);
            // console.log("primitiveMPEG3AudioSamples", samples);
            return this.primHandler.popNandPushIntIfOK(argCount + 1, samples);
        },

        primitiveMPEG3ReadAudio: function(argCount) {
            // console.log("primitiveMPEG3ReadAudio");
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveMPEG3EndOfAudio: function(argCount) {
            var player = this.playerFromStackArg(1);
            if (!player) return false;
            if (player.ended) {
                console.log("primitiveMPEG3EndOfAudio:", player.ended);
                debugger
            }
            return this.primHandler.popNandPushBoolIfOK(argCount + 1, player.ended);
        }
    };
}

document.addEventListener("DOMContentLoaded", function() {
    Squeak.registerExternalModule('Mpeg3Plugin', PloppMpeg3Plugin());
}, false);