function OpenGL() {
    "use strict";

    var identityMatrix = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ]);
    var modelViewMatrix = new Float32Array(identityMatrix);
    var projectionMatrix = new Float32Array(identityMatrix);
    var currentMatrix = modelViewMatrix;

    return {
        get context() {
            if (!this._context) {
                // this is a hack to get the context from B3DAcceleratorPlugin
                var modules = SqueakJS.vm.primHandler.loadedModules;
                var B3DAcceleratorPlugin = modules['B3DAcceleratorPlugin'];
                if (!B3DAcceleratorPlugin) throw Error("OpenGL: B3DAcceleratorPlugin not loaded");
                this._context = B3DAcceleratorPlugin.webglContext;
                console.log("OpenGL: got context from B3DAcceleratorPlugin", this._context);
            }
            return this._context;
        },

        // FFI functions get JS args, return JS result

        glClear: function(mask) {
            console.log("glClear 0x"+ mask.toString(16));
            this.context.clear(mask);
        },

        glClearColor: function(red, green, blue, alpha) {
            console.log("glClearColor", red, green, blue, alpha);
            this.context.clearColor(red, green, blue, alpha);
        },

        glColor3f: function(red, green, blue) {
            console.log("UNIMPLEMENTED glColor3f", red, green, blue);
        },

        glEnable: function(cap) {
            this.context; // ensure context is initialized
            switch (cap) {
                case 2884: // GL_CULL_FACE
                    console.log("glEnable GL_CULL_FACE");
                    this.context.enable(this.context.CULL_FACE);
                    break;
                case 2896: // GL_LIGHTING
                    console.log("UNIMPLEMENTED glEnable GL_LIGHTING");
                    break;
                case 2929: // GL_DEPTH_TEST
                    console.log("glEnable GL_DEPTH_TEST");
                    this.context.enable(this.context.DEPTH_TEST);
                    break;
                case 3553: // GL_TEXTURE_2D
                    console.log("UNIMPLEMENTED glEnable GL_TEXTURE_2D");
                    break;
                default:
                    console.log("UNIMPLEMENTED glEnable", cap);
            }
        },

        glDepthFunc: function(func) {
            console.log("glDepthFunc", func);
            this.context.depthFunc(func);
        },

        glDepthMask: function(flag) {
            console.log("glDepthMask", flag);
            this.context.depthMask(flag);
        },

        glDisable: function(cap) {
            switch (cap) {
                case 2884: // GL_CULL_FACE
                    console.log("glDisable GL_CULL_FACE");
                    this.context.disable(this.context.CULL_FACE);
                    break;
                case 2896: // GL_LIGHTING
                    console.log("glDisable GL_LIGHTING");
                    this.context.disable(this.context.BLEND);
                    break;
                case 3042: // GL_BLEND
                    console.log("glDisable GL_BLEND");
                    this.context.disable(this.context.BLEND);
                    break;
                case 16384: // GL_LIGHTING
                    console.log("UNIMPLEMENTED glDisable GL_LIGHTING");
                    break;
                case 16385: // GL_LIGHT0
                case 16386: // GL_LIGHT1
                case 16387: // GL_LIGHT2
                case 16388: // GL_LIGHT3
                case 16389: // GL_LIGHT4
                case 16390: // GL_LIGHT5
                case 16391: // GL_LIGHT6
                case 16392: // GL_LIGHT7
                    console.log("UNIMPLEMENTED glDisable GL_LIGHT", cap - 16384);
                    break;
                default:
                    console.log("UNIMPLEMENTED glDisable", cap);
            }
        },

        glFrontFace: function(mode) {
            console.log("glFrontFace", mode);
            this.context.frontFace(mode);
        },

        glLoadIdentity: function() {
            console.log("glLoadIdentity");
            currentMatrix.set(identityMatrix);
        },

        glLoadMatrixf: function(m) {
            console.log("glLoadMatrixf", m);
            currentMatrix.set(m);
        },

        glMatrixMode: function(mode) {
            switch (mode) {
                case 5888: // GL_MODELVIEW
                    console.log("glMatrixMode GL_MODELVIEW");
                    currentMatrix = modelViewMatrix;
                    break;
                case 5889: // GL_PROJECTION
                    console.log("glMatrixMode GL_PROJECTION");
                    currentMatrix = projectionMatrix;
                    break;
                default:
                    console.log("UNIMPLEMENTED glMatrixMode", mode);
            }
        },

        glMultMatrixf: function(m) {
            console.log("glMultMatrixf", m);
            var m1 = currentMatrix;
            var m2 = m;
            for (var row = 0; row < 16; row += 4) {
                m1[row+0] = m1[row+0] * m2[0] + m1[row+1] * m2[4] + m1[row+2] * m2[8] + m1[row+3] * m2[12];
                m1[row+1] = m1[row+0] * m2[1] + m1[row+1] * m2[5] + m1[row+2] * m2[9] + m1[row+3] * m2[13];
                m1[row+2] = m1[row+0] * m2[2] + m1[row+1] * m2[6] + m1[row+2] * m2[10] + m1[row+3] * m2[14];
                m1[row+3] = m1[row+0] * m2[3] + m1[row+1] * m2[7] + m1[row+2] * m2[11] + m1[row+3] * m2[15];
            }
        },

        glPixelStorei: function(pname, param) {
            switch (pname) {
                case 3313: // GL_UNPACK_ALIGNMENT
                    console.log("UNIMPLEMENTED glPixelStorei GL_UNPACK_ALIGNMENT", param);
                    break;
                case 3317: // GL_UNPACK_ROW_LENGTH
                    console.log("UNIMPLEMENTED glPixelStorei GL_UNPACK_ROW_LENGTH", param);
                    break;
                default:
                    console.log("UNIMPLEMENTED glPixelStorei", pname, param);
            }
        },

        glPushMatrix: function() {
            console.log("glPushMatrix");
            var m1 = currentMatrix;
            var m2 = new Float32Array(m1);
            currentMatrix = m2;
            currentMatrix.stack = m1;
        },

        glPopMatrix: function() {
            console.log("glPopMatrix");
            var m1 = currentMatrix;
            var m2 = m1.stack;
            if (!m2) throw Error("OpenGL: stack underflow");
            currentMatrix = m2;
            m1.stack = null;
        },


        glViewport: function(x, y, width, height) {
            console.log("UNIMPLEMENTED glViewport", x, y, width, height);
        },
    };
}

function registerOpenGL() {
    if (typeof Squeak === "object" && Squeak.registerExternalModule) {
        Squeak.registerExternalModule('libGL.so.1', OpenGL());
    } else self.setTimeout(registerOpenGL, 100);
};

registerOpenGL();
