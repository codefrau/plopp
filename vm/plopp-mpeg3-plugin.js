// Plopp Mpeg3Plugin, we play mp3 and mpg (but use mp4 for mpg)
// hardcoded to pretend we play videos at 800x600, 25fps
// and audio at 44100Hz
// empty video frames are sent to Squeak, videos are shown as overlay in the browser
// silent audio is sent to Squeak, we play directly via browser

function PloppMpeg3Plugin() {
    "use strict";

    var DEBUG = 0; // 0 = off, 1 = some, 2 = lots

    return {
        getModuleName: function() { return 'Mpeg3Plugin (plopp)'; },
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
            path = path.replace(/.*\/Plopp(Dev)?\//, "Contents/Resources/");
            path = path.replace(/\.mpg$/, ".mp4");
            var isAudio = path.match(/\.mp3$/);
            // We use PloppAudio or PloppVideo which have been
            // interacted with by the user, so they are allowed to play
            var player;
            if (isAudio) {
                player = PloppAudio;
                player.isAudio = true;
            } else {
                player = PloppVideo;
                player.isVideo = true;
                player.playsInline = true; // Safari
                document.body.appendChild(player);
                if (window.sqVideoCallback) sqVideoCallback(player, "open");
            }
            player.src = path; // start playing
            player.currentTime = 0; // start at beginning
            player.play();
            // create handle
            var handle = this.primHandler.makeStString("squeakjs-mpeg:" + path);
            handle.player = player;
            // freeze VM until player is actually playing
            this.vm.freeze(function(unfreeze) {
                function continueExecution() {
                    unfreeze();
                    unfreeze = null; // don't unfreeze twice
                }

                player.addEventListener('timeupdate',
                    function() {
                        if (player.currentTime < 0.1) return; // not playing yet
                        if (!unfreeze) return; // already failed or started
                        DEBUG > 0 && console.log("primitiveMPEG3Open: "
                            + (player.isVideo? player.videoWidth + "x" + player.videoHeight + ", " : "")
                            + player.duration + "s " + player.src);
                        if (player.isAudio) {
                            // we pretend to send samples so Squeak can track time
                            player.sentSamples = 0;
                            player.totalSamples = Math.floor(player.duration * 44100);
                        }
                        continueExecution();
                    },
                );
                player.onerror = function(err) {
                    if (!unfreeze) return; // too late
                    console.error("primitiveMPEG3Open: error", err);
                    continueExecution();
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
            DEBUG>0 && console.log("primitiveMPEG3Close", player.src);
            player.pause();
            if (player.isVideo) player.remove();
            try {
                player.removeAttribute('src');
                player.load();
            } catch (err) {}
            if (window.sqVideoCallback) sqVideoCallback(player, "close");
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
            DEBUG > 1 && console.log("primitiveMPEG3ReadFrame");
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveMPEG3GetFrame: function(argCount) {
            var player = this.playerFromStackArg(1);
            if (!player) return false;
            var frame = Math.floor(player.currentTime * 25);
            var frames = Math.floor(player.duration * 25);
            DEBUG > 1 && console.log("primitiveMPEG3GetFrame", frame, "of", frames);
            if (frame >= frames) frame = frames - 1;
            return this.primHandler.popNandPushIntIfOK(argCount + 1, frame);
        },

        primitiveMPEG3VideoFrames: function(argCount) {
            var player = this.playerFromStackArg(1);
            if (!player) return false;
            var frames = Math.floor(player.duration * 25);
            DEBUG > 1 && console.log("primitiveMPEG3VideoFrames", frames);
            return this.primHandler.popNandPushIntIfOK(argCount + 1, frames);
        },

        primitiveMPEG3SetFrame: function(argCount) {
            var player = this.playerFromStackArg(2);
            if (!player) return false;
            var frame = this.interpreterProxy.stackIntegerValue(1);
            // player.currentTime = frame / 25;
            DEBUG > 0 && console.log("IGNORING primitiveMPEG3SetFrame", frame, "(current time is " + player.currentTime.toFixed(1) + ")");
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveMPEG3DropFrames: function(argCount) {
            // var count = this.interpreterProxy.stackIntegerValue(1);
            DEBUG > 1 && console.log("primitiveMPEG3DropFrames", count);
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveMPEG3ReadFrameBufferOffset: function(argCount) {
            return this.primHandler.popNandPushIntIfOK(argCount + 1, 0);
        },

        primitiveMPEG3EndOfVideo: function(argCount) {
            var player = this.playerFromStackArg(1);
            if (!player) return false;
            DEBUG > 1 && console.log("primitiveMPEG3EndOfVideo:", player.ended);
            return this.primHandler.popNandPushBoolIfOK(argCount + 1, player.ended);
        },

        //////////// AUDIO /////////////

        primitiveMPEG3AudioChannels: function(argCount) {
            DEBUG > 1 && console.log("primitiveMPEG3AudioChannels", 1);
            // Plopp audio is always mono
            // but even if it was stereo - we're not sending samples to Squeak
            // so it doesn't matter
            return this.primHandler.popNandPushIntIfOK(argCount + 1, 1);
        },

        primitiveMPEG3SampleRate: function(argCount) {
            DEBUG > 1 && console.log("primitiveMPEG3SampleRate", 44100);
            return this.primHandler.popNandPushIntIfOK(argCount + 1, 44100);
        },

        primitiveMPEG3GetSample: function(argCount) {
            var player = this.playerFromStackArg(1);
            if (!player) return false;
            var sent = player.sentSamples;
            var actual = Math.floor(player.currentTime * 44100);
            var total = player.totalSamples;
            var samples = sent;
            if (samples > total) samples = total;
            if (actual > total || player.ended) actual = total;
            DEBUG > 1 && console.log("primitiveMPEG3GetSample sent:", sent, "/", total, "(todo:", total - sent, "), actual:", actual, "todo:", total - actual, "ended:", player.ended);
            return this.primHandler.popNandPushIntIfOK(argCount + 1, samples);
        },

        primitiveMPEG3AudioSamples: function(argCount) {
            var player = this.playerFromStackArg(1);
            if (!player) return false;
            var total = player.totalSamples;
            DEBUG > 1 && console.log("primitiveMPEG3AudioSamples", total);
            return this.primHandler.popNandPushIntIfOK(argCount + 1, total);
        },

        primitiveMPEG3ReadAudio: function(argCount) {
            // args: handle,  buffer, channel, samples, stream
            var player = this.playerFromStackArg(4);
            var sending = this.interpreterProxy.stackIntegerValue(1);
            // we need to keep track of the number of samples we sent
            player.sentSamples += sending;
            DEBUG > 1 && console.log("primitiveMPEG3ReadAudio: sending", sending, "=", player.sentSamples, "/", player.totalSamples, "todo:", player.totalSamples - player.sentSamples);
            this.interpreterProxy.pop(argCount);
            return true;
        },

        primitiveMPEG3EndOfAudio: function(argCount) {
            var player = this.playerFromStackArg(1);
            if (!player) return false;
            var sent = player.sentSamples;
            var actual = Math.floor(player.currentTime * 44100);
            var total = player.totalSamples;
            var samples = sent > actual ? sent : actual;    // in case Squeak is behind
            var ended = samples >= total || player.ended;
            if (ended) DEBUG > 1 && console.log("primitiveMPEG3EndOfAudio:", ended);
            return this.primHandler.popNandPushBoolIfOK(argCount + 1, ended);
        },
    };
}

document.addEventListener("DOMContentLoaded", function() {
    Squeak.registerExternalModule('Mpeg3Plugin', PloppMpeg3Plugin());
}, false);