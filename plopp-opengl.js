function OpenGL() {
    "use strict";

    function transformPoint(matrix, src, dst) {
        var x = src[0];
        var y = src[1];
        var z = src[2];
        var rx = x * matrix[0] + y * matrix[1] + z * matrix[2] + matrix[3];
        var ry = x * matrix[4] + y * matrix[5] + z * matrix[6] + matrix[7];
        var rz = x * matrix[8] + y * matrix[9] + z * matrix[10] + matrix[11];
        var rw = x * matrix[12] + y * matrix[13] + z * matrix[14] + matrix[15];
        if (rw === 1) {
            dst[0] = rx;
            dst[1] = ry;
            dst[2] = rz;
        } else {
            if (rw !== 0) rw = 1 / rw;
            dst[0] = rx * rw;
            dst[1] = ry * rw;
            dst[2] = rz * rw;
        }
        dst[3] = src[3];
    }

    function multMatrix(m1, m2) {
        for (var row = 0; row < 16; row += 4) {
            var c0 = m1[row+0] * m2[0] + m1[row+1] * m2[4] + m1[row+2] * m2[8] + m1[row+3] * m2[12];
            var c1 = m1[row+0] * m2[1] + m1[row+1] * m2[5] + m1[row+2] * m2[9] + m1[row+3] * m2[13];
            var c2 = m1[row+0] * m2[2] + m1[row+1] * m2[6] + m1[row+2] * m2[10] + m1[row+3] * m2[14];
            var c3 = m1[row+0] * m2[3] + m1[row+1] * m2[7] + m1[row+2] * m2[11] + m1[row+3] * m2[15];
            m1[row+0] = c0;
            m1[row+1] = c1;
            m1[row+2] = c2;
            m1[row+3] = c3;
        }
    }

    function translateMatrix(m, x, y, z) {
        m[12] += x * m[0] + y * m[4] + z * m[8];
        m[13] += x * m[1] + y * m[5] + z * m[9];
        m[14] += x * m[2] + y * m[6] + z * m[10];
        m[15] += x * m[3] + y * m[7] + z * m[11];
    }

    var identity = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ]);

    var GL_LIGHTING = 2896;
    var GL_LIGHT0 = 16384;
    var GL_LIGHT1 = 16385;
    var GL_LIGHT2 = 16386;
    var GL_LIGHT3 = 16387;
    var GL_LIGHT4 = 16388;
    var GL_LIGHT5 = 16389;
    var GL_LIGHT6 = 16390;
    var GL_LIGHT7 = 16391;
    var GL_TEXTURE_COMPRESSED = 34465;

    var HAS_NORMAL = 1;
    var HAS_COLOR = 2;
    var HAS_TEXCOORD = 4;

    // Emulate OpenGL state
    var gl = {
        extensions: "ARB_texture_non_power_of_two SGIS_generate_mipmap",
        color: new Float32Array(4),
        normal: new Float32Array([0, 0, 1]),
        texCoord: new Float32Array(2),
        primitive: null, // for glBegin/glEnd
        primitiveAttrs: 0, // for glVertex
        matrix: null, // current matrix (modelView or projection)
        modelView: new Float32Array(identity),
        projection: new Float32Array(identity),
        lighting: false,
        lights: [], // light state
        material: null, // material state
        textureId: 0, // texture id generator
        textures: {}, // webgl texture objects by id
        textureUnit: null, // active texture unit
        textureUnits: [], // texture unit state
        listId: 0, // display list id generator
        lists: {}, // display lists by id
    };

    var webgl; // the actual WebGL context

    return {
        initialiseModule: function() {
            console.log("OpenGL: initialiseModule");
            // get the context from B3DAcceleratorPlugin
            var modules = SqueakJS.vm.primHandler.loadedModules;
            var B3DAcceleratorPlugin = modules['B3DAcceleratorPlugin'];
            if (!B3DAcceleratorPlugin) throw Error("OpenGL: B3DAcceleratorPlugin not loaded");
            webgl = B3DAcceleratorPlugin.webglContext;
            console.log("OpenGL: got context from B3DAcceleratorPlugin", webgl);
            // for debug access
            this.webgl = webgl;
            this.gl = gl;
            // set initial state
            gl.matrix = gl.modelView;
            gl.color.set([1, 1, 1, 1]);
            for (var i = 0; i < 8; i++) {
                gl.lights[i] = {
                    enabled: false,
                    ambient: new Float32Array([0, 0, 0, 1]),
                    diffuse: new Float32Array([0, 0, 0, 1]),
                    specular: new Float32Array([0, 0, 0, 1]),
                    position: new Float32Array([0, 0, 1, 0]),
                    spotCutoff: 180,
                };
            }
            gl.material = {
                ambient: new Float32Array([0.2, 0.2, 0.2, 1]),
                diffuse: new Float32Array([0.8, 0.8, 0.8, 1]),
                specular: new Float32Array([0, 0, 0, 1]),
                emission: new Float32Array([0, 0, 0, 1]),
                shininess: 0,
            };
            for (var i = 0; i < 8; i++) {
                gl.textureUnits[i] = {
                    mipmap: false,
                };
            }
            gl.textureUnit = gl.textureUnits[0];
        },

        // FFI functions get JS args, return JS result

        glAlphaFunc: function(func, ref) {
            console.log("UNIMPLEMENTED glAlphaFunc", func, ref);
        },

        glBegin: function(mode) {
            console.log("glBegin", mode);
            gl.primitive = {
                mode: mode,
                vertices: [],
                vertexSize: 0,
                vertexAttrs: 0,
            }
            gl.primitiveAttrs = 0;
        },

        glBindTexture: function(target, texture) {
            console.log("glBindTexture", target, texture);
            var texture = gl.textures[texture];
            if (!texture) throw Error("OpenGL: texture not found");
            webgl.bindTexture(target, texture);
            gl.texture = texture;
        },

        glBlendFunc: function(sfactor, dfactor) {
            console.log("glBlendFunc", sfactor, dfactor);
            webgl.blendFunc(sfactor, dfactor);
        },

        glClear: function(mask) {
            console.log("glClear 0x"+ mask.toString(16));
            webgl.clear(mask);
        },

        glClearColor: function(red, green, blue, alpha) {
            console.log("glClearColor", red, green, blue, alpha);
            webgl.clearColor(red, green, blue, alpha);
        },

        glColor3f: function(red, green, blue) {
            console.log("glColor3f", red, green, blue);
            gl.color[0] = red;
            gl.color[1] = green;
            gl.color[2] = blue;
            gl.color[3] = 1;
            gl.primitiveAttrs |= HAS_COLOR;
        },

        glColor4f: function(red, green, blue, alpha) {
            console.log("glColor4f", red, green, blue, alpha);
            gl.color[0] = red;
            gl.color[1] = green;
            gl.color[2] = blue;
            gl.color[3] = alpha;
            gl.primitiveAttrs |= HAS_COLOR;
        },

        glColorMask: function(red, green, blue, alpha) {
            console.log("glColorMask", red, green, blue, alpha);
            webgl.colorMask(red, green, blue, alpha);
        },

        glEnable: function(cap) {
            switch (cap) {
                case 2884: // GL_CULL_FACE
                    console.log("glEnable GL_CULL_FACE");
                    webgl.enable(webgl.CULL_FACE);
                    break;
                case GL_LIGHTING:
                    console.log("glEnable GL_LIGHTING");
                    gl.lighting = true;
                    break;
                case 2929: // GL_DEPTH_TEST
                    console.log("glEnable GL_DEPTH_TEST");
                    webgl.enable(webgl.DEPTH_TEST);
                    break;
                case webgl.TEXTURE_2D:
                    console.log("UNIMPLEMENTED glEnable GL_TEXTURE_2D");
                    break;
                case GL_LIGHT0:
                case GL_LIGHT1:
                case GL_LIGHT2:
                case GL_LIGHT3:
                case GL_LIGHT4:
                case GL_LIGHT5:
                case GL_LIGHT6:
                case GL_LIGHT7:
                    console.log("glEnable GL_LIGHT" + (cap - GL_LIGHT0));
                    gl.lights[cap - GL_LIGHT0].enabled = true;
                    break;
                default:
                    console.log("UNIMPLEMENTED glEnable", cap);
            }
        },

        glEnd: function() {
            var primitive = gl.primitive;
            gl.primitive = null;
            switch (primitive.mode) {
                case 0: // GL_POINTS
                    console.log("UNIMPLEMENTED glEnd GL_POINTS");
                    break;
                case 1: // GL_LINES
                    console.log("UNIMPLEMENTED glEnd GL_LINES");
                    break;
                case 2: // GL_LINE_LOOP
                    console.log("UNIMPLEMENTED glEnd GL_LINE_LOOP");
                    break;
                case 3: // GL_LINE_STRIP
                    console.log("UNIMPLEMENTED glEnd GL_LINE_STRIP");
                    break;
                case 4: // GL_TRIANGLES
                    console.log("UNIMPLEMENTED glEnd GL_TRIANGLES");
                    break;
                case 5: // GL_TRIANGLE_STRIP
                    console.log("UNIMPLEMENTED glEnd GL_TRIANGLE_STRIP");
                    break;
                case 6: // GL_TRIANGLE_FAN
                    console.log("UNIMPLEMENTED glEnd GL_TRIANGLE_FAN");
                    break;
                case 7: // GL_QUADS
                    console.log("UNIMPLEMENTED glEnd GL_QUADS");
                    break;
                case 8: // GL_QUAD_STRIP
                    console.log("UNIMPLEMENTED glEnd GL_QUAD_STRIP");
                    break;
                case 9: // GL_POLYGON
                    console.log("UNIMPLEMENTED glEnd GL_POLYGON");
                    break;
                default:
                    console.log("UNIMPLEMENTED glEnd", primitive.mode);
            }
            console.log(primitive);
        },

        glEndList: function() {
            console.log("glEndList");
            var list = gl.list;
            gl.list = null;
            gl.lists[list.id] = list;
        },

        glDepthFunc: function(func) {
            console.log("glDepthFunc", func);
            webgl.depthFunc(func);
        },

        glDepthMask: function(flag) {
            console.log("glDepthMask", flag);
            webgl.depthMask(flag);
        },

        glDisable: function(cap) {
            switch (cap) {
                case 2884: // GL_CULL_FACE
                    console.log("glDisable GL_CULL_FACE");
                    webgl.disable(webgl.CULL_FACE);
                    break;
                case GL_LIGHTING:
                    console.log("glDisable GL_LIGHTING");
                    gl.lighting = false;
                    break;
                case 3042: // GL_BLEND
                    console.log("glDisable GL_BLEND");
                    webgl.disable(webgl.BLEND);
                    break;
                case GL_LIGHT0:
                case GL_LIGHT1:
                case GL_LIGHT2:
                case GL_LIGHT3:
                case GL_LIGHT4:
                case GL_LIGHT5:
                case GL_LIGHT6:
                case GL_LIGHT7:
                    console.log("glDisable GL_LIGHT" + (cap - GL_LIGHT0));
                    gl.lights[cap - GL_LIGHT0].enabled = false;
                    break;
                default:
                    console.log("UNIMPLEMENTED glDisable", cap);
            }
        },

        glFrontFace: function(mode) {
            console.log("glFrontFace", mode);
            webgl.frontFace(mode);
        },

        glGenLists: function(range) {
            console.log("glGenLists", range);
            var firstId = 0;
            if (range > 0) {
                firstId = gl.listId + 1;
                gl.listId += range;
            }
            return firstId;
        },

        glGenTextures: function(n, textures) {
            for (var i = 0; i < n; i++) {
                var id = ++gl.textureId;
                gl.textures[id] = webgl.createTexture();
                textures[i] = id;
            }
            console.log("glGenTextures", n, Array.from(textures));
        },

        glGetString: function(name) {
            switch (name) {
                case 7939: // GL_EXTENSIONS
                    console.log("glGetString GL_EXTENSIONS");
                    return gl.extensions;
                default:
                    console.log("UNIMPLEMENTED glGetString", name);
            }
            return "";
        },

        glIsEnabled: function(cap) {
            switch (cap) {
                case GL_LIGHTING:
                    console.log("glIsEnabled GL_LIGHTING");
                    return gl.lighting;
                default:
                    console.log("UNIMPLEMENTED glIsEnabled", cap);
            }
            return false;
        },

        glLightf: function(light, pname, param) {
            var i = light - GL_LIGHT0;
            switch (pname) {
                case 4614: // GL_SPOT_CUTOFF
                    console.log("glLightf", i, "GL_SPOT_CUTOFF", param);
                    gl.lights[i].spotCutoff = param;
                    break;
                default:
                    console.log("UNIMPLEMENTED glLightf", i, pname, param);
            }
        },

        glLightfv: function(light, pname, param) {
            var i = light - GL_LIGHT0;
            switch (pname) {
                case 4608: // GL_AMBIENT
                    console.log("glLightfv", i, "GL_AMBIENT", param);
                    gl.lights[i].ambient = param;
                    break;
                case 4609: // GL_DIFFUSE
                    console.log("glLightfv", i, "GL_DIFFUSE", param);
                    gl.lights[i].diffuse = param;
                    break;
                case 4610: // GL_SPECULAR
                    console.log("glLightfv", i, "GL_SPECULAR", param);
                    gl.lights[i].specular = param;
                    break;
                case 4611: // GL_POSITION
                    console.log("glLightfv", i, "GL_POSITION", param);
                    transformPoint(gl.modelView, param, gl.lights[i].position);
                    break;
                default:
                    console.log("UNIMPLEMENTED glLightfv", i, pname, param);
            }
        },

        glLoadIdentity: function() {
            console.log("glLoadIdentity");
            gl.matrix.set(identity);
        },

        glLoadMatrixf: function(m) {
            console.log("glLoadMatrixf", Array.from(m));
            gl.matrix.set(m);
        },

        glMaterialfv: function(face, pname, param) {
            switch (pname) {
                case 4608: // GL_AMBIENT
                    console.log("glMaterialfv GL_AMBIENT", param);
                    gl.material.ambient = param;
                    break;
                case 4609: // GL_DIFFUSE
                    console.log("glMaterialfv GL_DIFFUSE", param);
                    gl.material.diffuse = param;
                    break;
                case 4610: // GL_SPECULAR
                    console.log("glMaterialfv GL_SPECULAR", param);
                    gl.material.specular = param;
                    break;
                case 5632: // GL_EMISSION
                    console.log("glMaterialfv GL_EMISSION", param);
                    gl.material.emission = param;
                    break;
                case 5633: // GL_SHININESS
                    console.log("glMaterialfv GL_SHININESS", param);
                    gl.material.shininess = param[0];
                    break;
                case 5634: // GL_AMBIENT_AND_DIFFUSE
                    console.log("glMaterialfv GL_AMBIENT_AND_DIFFUSE", param);
                    gl.material.ambient = param;
                    gl.material.diffuse = param;
                    break;
                default:
                    console.log("UNIMPLEMENTED glMaterialfv", face, pname, param);
            }
        },

        glMatrixMode: function(mode) {
            switch (mode) {
                case 5888: // GL_MODELVIEW
                    console.log("glMatrixMode GL_MODELVIEW");
                    gl.matrix = gl.modelView;
                    break;
                case 5889: // GL_PROJECTION
                    console.log("glMatrixMode GL_PROJECTION");
                    gl.matrix = gl.projection;
                    break;
                default:
                    console.log("UNIMPLEMENTED glMatrixMode", mode);
            }
        },

        glMultMatrixf: function(m) {
            console.log("glMultMatrixf", Array.from(m));
            multMatrix(gl.matrix, m);
        },

        glNewList: function(list, mode) {
            console.log("glNewList", list, mode);
            var newList = {
                id: list,
                mode: mode,
            };
            gl.list = newList;
        },

        glNormal3f: function(nx, ny, nz) {
            console.log("glNormal3f", nx, ny, nz);
            gl.normal[0] = nx;
            gl.normal[1] = ny;
            gl.normal[2] = nz;
            gl.primitiveAttrs |= HAS_NORMAL;
        },

        glNormal3fv: function(v) {
            console.log("glNormal3fv", Array.from(v));
            gl.normal.set(v);
            gl.primitiveAttrs |= HAS_NORMAL;
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

        glPolygonOffset: function(factor, units) {
            console.log("glPolygonOffset", factor, units);
            webgl.polygonOffset(factor, units);
        },

        glPushMatrix: function() {
            console.log("glPushMatrix");
            var m1 = gl.matrix;
            var m2 = new Float32Array(m1);
            gl.matrix = m2;
            gl.matrix.stack = m1;
        },

        glPopMatrix: function() {
            console.log("glPopMatrix");
            var m1 = gl.matrix;
            var m2 = m1.stack;
            if (!m2) return console.warn("OpenGL: matrix stack underflow");
            gl.matrix = m2;
            m1.stack = null;
        },

        glTranslated: function(x, y, z) {
            console.log("glTranslated", x, y, z);
            translateMatrix(gl.matrix, x, y, z);
        },

        glTranslatef: function(x, y, z) {
            console.log("glTranslatef", x, y, z);
            translateMatrix(gl.matrix, x, y, z);
        },

        glScaled: function(x, y, z) {
            console.log("glScaled", x, y, z);
            var m = gl.matrix;
            m[0] *= x; m[1] *= x; m[2] *= x; m[3] *= x;
            m[4] *= y; m[5] *= y; m[6] *= y; m[7] *= y;
            m[8] *= z; m[9] *= z; m[10] *= z; m[11] *= z;
        },

        glStencilFunc: function(func, ref, mask) {
            console.log("glStencilFunc", func, ref, mask);
            webgl.stencilFunc(func, ref, mask);
        },

        glStencilOp: function(fail, zfail, zpass) {
            console.log("glStencilOp", fail, zfail, zpass);
            webgl.stencilOp(fail, zfail, zpass);
        },

        glTexImage2D: function(target, level, internalformat, width, height, border, format, type, pixels) {
            console.log("glTexImage2D", target, level, internalformat, width, height, border, format, type, pixels);
            switch (type) {
                case webgl.UNSIGNED_BYTE:
                    pixels = new Uint8Array(pixels);
                    break;
                default:
                    console.log("UNIMPLEMENTED glTexImage2D type " + type);
            }
            webgl.texImage2D(target, level, internalformat, width, height, border, format, type, pixels);
        },

        glGetTexLevelParameteriv: function(target, level, pname, params) {
            switch (pname) {
                case GL_TEXTURE_COMPRESSED:
                    return false;
                default:
                    console.log("UNIMPLEMENTED glGetTexLevelParameteriv", target, level, pname, params);
            }
        },

        glTexCoord2f: function(s, t) {
            console.log("glTexCoord2f", s, t);
            gl.texCoord[0] = s;
            gl.texCoord[1] = t;
            gl.primitiveAttrs |= HAS_TEXCOORD;
        },

        glTexParameteri: function(target, pname, param) {
            console.log("glTexParameteri", target, pname, param);
            webgl.texParameteri(target, pname, param);
            if (pname === gl.TEXTURE_MIN_FILTER) {
                gl.textureUnit.mipmap = param !== gl.NEAREST && param !== gl.LINEAR;
            }
        },

        glVertex2f: function(x, y) {
            console.log("glVertex2f", x, y);
            var position = [x, y, 0, 1];
            this.pushVertex(position);
        },

        glVertex3f: function(x, y, z) {
            console.log("glVertex3f", x, y, z);
            var position = [x, y, z];
            this.pushVertex(position);
        },

        glVertex3fv: function(v) {
            console.log("glVertex3fv", Array.from(v));
            this.pushVertex(v);
        },

        glViewport: function(x, y, width, height) {
            console.log("glViewport", x, y, width, height);
            webgl.viewport(x, y, width, height);
        },

        pushVertex: function(position) {
            var primitive = gl.primitive;
            if (!primitive) throw Error("OpenGL: glBegin not called");
            if (!primitive.vertexSize) {
                var vertexSize = 3;
                if (gl.primitiveAttrs & HAS_NORMAL) vertexSize += 3;
                if (gl.primitiveAttrs & HAS_COLOR) vertexSize += 4;
                if (gl.primitiveAttrs & HAS_TEXCOORD) vertexSize += 2;
                primitive.vertexSize = vertexSize;
                primitive.vertexAttrs = gl.primitiveAttrs;
            }
            var vertex = new Float32Array(primitive.vertexSize);
            var offset = 0;
            vertex.set(position, offset); offset += 3;
            if (primitive.vertexAttrs & HAS_NORMAL) {
                vertex.set(gl.normal, offset); offset += 3;
            }
            if (primitive.vertexAttrs & HAS_COLOR) {
                vertex.set(gl.color, offset); offset += 4;
            }
            if (primitive.vertexAttrs & HAS_TEXCOORD) {
                vertex.set(gl.texCoord, offset); offset += 2;
            }
            primitive.vertices.push(vertex);
        },
    };
}

function registerOpenGL() {
    if (typeof Squeak === "object" && Squeak.registerExternalModule) {
        Squeak.registerExternalModule('libGL.so.1', OpenGL());
    } else self.setTimeout(registerOpenGL, 100);
};

registerOpenGL();
