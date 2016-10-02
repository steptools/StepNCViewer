/* G. Hemingway Copyright @2015
 * Asynchronous loading and parsing of CAD model information
 *
 * Extended by Gabor Pap to include TySON decoding
 */

/*********************************************************************
 *
 * TYSON decoder
 *
 *********************************************************************/

/*
 * Copyright 2013 Art Compiler LLC
 * Copyright 2013 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

/*
 This module implements a decoder of TYSON (an extension of UBJSON) objects.

 !!! The encoder has NOT been updated to create TYSON, rather it outputs UBJSON.

 startObject(flags)
 finishObject(size)
 startArray(flags)
 finishArray(size)
 startString(flags)
 finishString(size)
 writeByte(val)
 writeI16(val)
 writeI32(val)
 writeI64(val)
 writeF32(val)
 writeF64(val)

 imported functions

 imports = {
 resizeHeap,
 }

 */

var DEBUG = false;

var assert = !DEBUG
    ? function () {}
    : function (val, str) {
        if (str === void 0) {
            str = "failed!";
        }
        if (!val) {
            throw("assert: " + str);
        }
    };

var TYSON = (function () {

    var Core = function Core (imports, heap) {
        // BEGIN SNIP
        var pos = 0;
        var bytesU8 = new Uint8Array(heap);
        var bytesD32 = new Float32Array(heap);
        var bytesD64 = new Float64Array(heap);

        var imul = Math.imul;
        var pushNull = imports.pushNull;
        var pushTrue = imports.pushTrue;
        var pushFalse = imports.pushFalse;
        var pushInt = imports.pushInt;
        var pushFloat32 = imports.pushFloat32;
        var pushFloat64 = imports.pushFloat64;
        var pushDecimal = imports.pushDecimal;
        var pushString = imports.pushString;
        var newTypedArray = imports.newTypedArray;
        var newObject = imports.newObject;
        var newArray = imports.newArray;

        // Markers for UBJSON types
        var $o = 111;
        var $O = 79;
        var $a = 97;
        var $A = 65;
        var $B = 66;
        var $i = 105;
        var $I = 73;
        var $L = 76;
        var $d = 100;
        var $D = 68;
        var $h = 104;
        var $H = 72;
        var $s = 115;
        var $S = 83;
        var $Z = 90;
        var $T = 84;
        var $F = 70;
        var $M = 77;

        var $_ = 95;   // place holder byte

        // Flag bits
        var BIG = 0x00000001;

        // Return the current position in the ArrayBuffer.
        function getPos () {
            return pos | 0;
        }

        function setPos (p) {
            p = p | 0;
            pos = p;
        }

        // BEGIN Builder

        // Write a null value.
        function writeNull () {
            bytesU8[pos] = $Z;
            pos = pos + 1 | 0;
        }

        // Write a true value.
        function writeTrue () {
            bytesU8[pos] = $T;
            pos = pos + 1 | 0;
        }

        // Write a false value.
        function writeFalse () {
            bytesU8[pos] = $F;
            pos = pos + 1 | 0;
        }

        // Write a byte (int8) value.
        function writeByte (val) {
            val = val | 0;
            bytesU8[pos] = $B;
            bytesU8[pos + 1 | 0] = val;
            pos = pos + 2 | 0;
        }

        // Write an int16 value.
        function writeI16 (val) {
            val = val | 0;
            bytesU8[pos] = $i;
            bytesU8[pos + 1 | 0] = val >> 8 & 0xFF;
            bytesU8[pos + 2 | 0] = val & 0xFF;
            pos = pos + 3 | 0;
        }

        // Write an int32 value.
        function writeI32 (val) {
            val = val | 0;
            bytesU8[pos] = $I;
            bytesU8[pos + 1 | 0] = val >> 24 & 0xFF;
            bytesU8[pos + 2 | 0] = val >> 16 & 0xFF;
            bytesU8[pos + 3 | 0] = val >> 8 & 0xFF;
            bytesU8[pos + 4 | 0] = val & 0xFF;
            pos = pos + 5 | 0;
        }

        // WARNING writeD32() and writeD64() write bytes out with the reverse
        // endian-ness of the host computer. The order is reversed because UBJSON
        // demands big endian-ness and most computers use litte endian as their
        // native encoding. Either way the dependency of this implementation on the
        // native endian-ness of the host computer creates an incompatibility with
        // the UBJSON spec. This bug will only manifest itself when reading and
        // writing UBJSON values from a computer or UBJSON implementation with a
        // different endian-ness. However, these are not use cases that are in scope
        // for the current implementation.

        // Write an float32 value.
        function writeD32 (val) {
            val = +val;
            var scratchPos = 0;
            scratchPos = imul(pos + 1, 4) | 0;
            bytesD32[scratchPos >> 2] = val;  // Write out float32 to get bytes.
            bytesU8[pos] = $d;
            // Copy bytes in reverse order to produce big endian on Intel hardward.
            bytesU8[pos + 1 | 0] = bytesU8[scratchPos + 3 | 0];
            bytesU8[pos + 2 | 0] = bytesU8[scratchPos + 2 | 0];
            bytesU8[pos + 3 | 0] = bytesU8[scratchPos + 1 | 0];
            bytesU8[pos + 4 | 0] = bytesU8[scratchPos | 0];
            pos = pos + 5 | 0;
        }

        // Write an float64 value.
        function writeD64 (val) {
            val = +val;
            var scratchPos = 0;
            scratchPos = imul(pos + 1, 8) | 0;
            bytesD64[scratchPos >> 3] = val;  // Write out float64 to get bytes.
            bytesU8[pos] = $D;
            // Copy bytes in reverse order to produce big endian on Intel hardward.
            bytesU8[pos + 1 | 0] = bytesU8[scratchPos + 7 | 0];
            bytesU8[pos + 2 | 0] = bytesU8[scratchPos + 6 | 0];
            bytesU8[pos + 3 | 0] = bytesU8[scratchPos + 5 | 0];
            bytesU8[pos + 4 | 0] = bytesU8[scratchPos + 4 | 0];
            bytesU8[pos + 5 | 0] = bytesU8[scratchPos + 3 | 0];
            bytesU8[pos + 6 | 0] = bytesU8[scratchPos + 2 | 0];
            bytesU8[pos + 7 | 0] = bytesU8[scratchPos + 1 | 0];
            bytesU8[pos + 8 | 0] = bytesU8[scratchPos | 0];
            pos = pos + 9 | 0;
        }

        // Start an object. Allocate space for a new object. (flags & BIG) means
        // more than 255 properties.
        function startObject (flags) {
            flags = flags | 0;
            if ((flags & BIG | 0) == 0) {
                bytesU8[pos] = $o;
                bytesU8[pos + 1 | 0] = $_;
                pos = pos + 2 | 0;
            } else {
                bytesU8[pos] = $O;
                bytesU8[pos + 1 | 0] = $_;
                bytesU8[pos + 2 | 0] = $_;
                bytesU8[pos + 3 | 0] = $_;
                bytesU8[pos + 4 | 0] = $_;
                pos = pos + 5 | 0;
            }
        }

        // Finish an object. Offset is position before calling startObject().
        function finishObject (offset, count, flags) {
            offset = offset | 0;
            count = count | 0;
            flags = flags | 0;
            if ((flags & BIG | 0) == 0) {
                bytesU8[offset + 1 | 0] = count;
            } else {
                bytesU8[offset + 1 | 0] = count >> 24 & 0xFF;
                bytesU8[offset + 2 | 0] = count >> 16 & 0xFF;
                bytesU8[offset + 3 | 0] = count >> 8 & 0xFF;
                bytesU8[offset + 4 | 0] = count & 0xFF;
            }
        }

        // Start an array. Allocate space for a new array. (flags & BIG) means
        // more than 255 elements.
        function startArray (flags) {
            flags = flags | 0;
            if ((flags & BIG | 0) == 0) {
                bytesU8[pos] = $a;
                bytesU8[pos + 1 | 0] = $_;
                pos = pos + 2 | 0;
            } else {
                bytesU8[pos] = $A;
                bytesU8[pos + 1 | 0] = $_;
                bytesU8[pos + 2 | 0] = $_;
                bytesU8[pos + 3 | 0] = $_;
                bytesU8[pos + 4 | 0] = $_;
                pos = pos + 5 | 0;
            }
        }

        // Finish an array. Offset is position before calling startArray().
        function finishArray (offset, count, flags) {
            offset = offset | 0;
            count = count | 0;
            flags = flags | 0;
            if ((flags & BIG | 0) == 0) {
                bytesU8[offset + 1 | 0] = count;
            } else {
                bytesU8[offset + 1 | 0] = count >> 24 & 0xFF;
                bytesU8[offset + 2 | 0] = count >> 16 & 0xFF;
                bytesU8[offset + 3 | 0] = count >> 8 & 0xFF;
                bytesU8[offset + 4 | 0] = count & 0xFF;
            }
        }

        // Start a string value. Allocate space for a new string. (flags & BIG)
        // means contains more 255 bytes. Call writeStringChar() to add characters,
        // and finishString() to patch the byte count. Notice that characters are
        // encoded as UTF8 so they may consist of more than one byte.
        function startString (flags) {
            flags = flags | 0;
            if ((flags & BIG | 0) == 0) {
                bytesU8[pos] = $s;
                bytesU8[pos + 1 | 0] = $_;
                pos = pos + 2 | 0;
            } else {
                bytesU8[pos] = $S;
                bytesU8[pos + 1 | 0] = $_;
                bytesU8[pos + 2 | 0] = $_;
                bytesU8[pos + 3 | 0] = $_;
                bytesU8[pos + 4 | 0] = $_;
                pos = pos + 5 | 0;
            }
        }

        // Finish a string value. Patch its byte count.
        function finishString (offset, count, flags) {
            offset = offset | 0;
            count = count | 0;
            flags = flags | 0;
            if ((flags & BIG | 0) == 0) {
                bytesU8[offset + 1 | 0] = count;
            } else {
                bytesU8[offset + 1 | 0] = count >> 24 & 0xFF;
                bytesU8[offset + 2 | 0] = count >> 16 & 0xFF;
                bytesU8[offset + 3 | 0] = count >> 8 & 0xFF;
                bytesU8[offset + 4 | 0] = count & 0xFF;
            }
        }

        // Write a UTF8 character into a string value.
        function writeStringChar (val) {
            val = val | 0;
            // FIXME decode multibyte characters.
            bytesU8[pos] = val;
            pos = pos + 1 | 0;
        }

        // END Builder


        // BEGIN Decoder
        // Construct a TYSON value from a sequence of bytes.
        function decode () {
            var marker = 0;
            var count = 0;
            var arrayType = 0;
            var i = 0;
            while (1) {
                marker = readI8() | 0;
                switch (marker | 0) {
                case 90:  // $Z
                    pushNull();
                    return;
                case 84:  // $T
                    pushTrue();
                    return;
                case 70:  // $F
                    pushFalse();
                    return;
                case 66:  // $B
                    pushInt(readI8() | 0);
                    return;
                case 105: // $i
                    pushInt(readI16() | 0);
                    return;
                case 73:  // $I
                    pushInt(readI32() | 0);
                    return;
                case 100: // $d
                    pushFloat32();
                    return;
                case 68:  // $D
                    pushFloat64();
                    return;
                case 104:  // $h
                    pushDecimal(readI8() | 0);
                    return;
                case 72:  // $H
                    pushDecimal(readI32() | 0);
                    return;
                case 115: // $s
                    pushString(readI8() | 0)
                    return;
                case 83:  // $S
                    pushString(readI32() | 0)
                    return;
                case 111: // $o
                    count = readI8() | 0;
                    for (i = 0; ~~i < ~~count; i = i + 1 | 0) {
                        decode();
                        decode();
                    }
                    newObject(count | 0);
                    return;
                case 79:  // $O
                    count = readI32() | 0;
                    for (i = 0; ~~i < ~~count; i = i + 1 | 0) {
                        decode();
                        decode();
                    }
                    newObject(count | 0);
                    return;
                case 97:  // $a
                    arrayType = readI8() | 0;
                    count = readI8() | 0;

                    if ((arrayType | 0) == (77 | 0)) {  // $M
                        for (i = 0; ~~i < ~~count; i = i + 1 | 0) {
                            decode();
                        }
                        newArray(count | 0);
                    } else {
                        newTypedArray(count | 0, arrayType | 0);
                    }
                    return;
                case 65:  // $A
                    arrayType = readI8() | 0;
                    count = readI32() | 0;

                    if ((arrayType | 0) == (77 | 0)) {  // $M
                        for (i = 0; ~~i < ~~count; i = i + 1 | 0) {
                            decode();
                        }
                        newArray(count | 0);
                    } else {
                        newTypedArray(count | 0, arrayType | 0);
                    }
                    return;
                default:
                    return;
                }
            }
        }

        function readI8 () {
            var val = 0;
            val = bytesU8[pos] | 0;
            pos = pos + 1 | 0;
            return val | 0;
        }

        // Read an int16 value.
        function readI16 () {
            var val = 0;
            val = bytesU8[pos] << 8 | 0;
            val = (val + (bytesU8[pos + 1 | 0] | 0)) | 0;
            pos = pos + 2 | 0;
            return val | 0;
        }

        // Read an int32 value.
        function readI32 () {
            var val = 0;
            val = bytesU8[pos] << 24;
            val = (val + (bytesU8[pos + 1 | 0] << 16 | 0)) | 0;
            val = (val + (bytesU8[pos + 2 | 0] << 8 | 0)) | 0;
            val = (val + (bytesU8[pos + 3 | 0] | 0)) | 0;
            pos = pos + 4 | 0;
            return val | 0;
        }

        // END Decoder
        // END SNIP

        // Exports
        return {
            // Builder functions
            writeNull:writeNull,
            writeTrue:writeTrue,
            writeFalse:writeFalse,
            writeByte:writeByte,
            writeI16:writeI16,
            writeI32:writeI32,
            writeD32:writeD32,
            writeD64:writeD64,
            startObject:startObject,
            finishObject:finishObject,
            startArray:startArray,
            finishArray:finishArray,
            startString:startString,
            finishString:finishString,
            writeStringChar:writeStringChar,
            // Decode function
            decode:decode,
            // Utils
            getPos:getPos,
            setPos:setPos
        };
    };

    var TYSON = function TYSON (buffer) {
        var view = new DataView(buffer);
        var values = [];
        var imports = {
            pushNull:function () {
                values.push(null);
            },
            pushTrue:function () {
                values.push(true);
            },
            pushFalse:function () {
                values.push(false);
            },
            pushInt:function (val) {
                values.push(val);
            },
            pushFloat32:function () {
                var pos = core.getPos();
                var val = view.getFloat32(pos);
                values.push(val);
                core.setPos(pos + 4);
            },
            pushFloat64:function () {
                var pos = core.getPos();
                var val = view.getFloat64(pos);
                values.push(val);
                core.setPos(pos + 8);
            },
            pushDecimal:function (size) {
                var start = core.getPos();
                var stop = start + size;
                var val = "";
                for (var i = start; i < stop; i++) {
                    val += String.fromCharCode(view.getInt8(i));
                }
                values.push(Number(val));
                core.setPos(stop);
            },
            pushString:function (size) {
                var start = core.getPos();
                var stop = start + size;
                var val = "";
                for (var i = start; i < stop; i++) {
                    val += String.fromCharCode(view.getInt8(i));
                }
                values.push(val);
                core.setPos(stop);
            },
            newObject:function (count) {
                var val = {};
                for (var i = count - 1; i >= 0; i--) {
                    var v = values.pop();
                    var n = values.pop();
                    val[n] = v;
                }
                values.push(val);
            },
            newTypedArray:function (count, arrayType){
                var start = core.getPos();
                var bytes = 1;
                switch (arrayType) {
                    case 66:  // $B
                        bytes = 1;
                        break;
                    case 105: // $i
                        bytes = 2;
                        break;
                    case 73:  // $I
                        bytes = 4;
                        break;
                }
                var stop = start + count * bytes;
                var valueArray = [];
                var i, j;
                for (i = 0, j = start; i < count; i++, j += bytes) {
                    switch (bytes) {
                        case 1:  // $B
                            valueArray[i] = view.getInt8(j);
                            break;
                        case 2: // $i
                            valueArray[i] = view.getInt16(j);
                            break;
                        case 4:  // $I
                            valueArray[i] = view.getInt32(j);
                            break;
                    }
                }
                values.push(valueArray);
                core.setPos(stop);
            },
            newArray:function (count) {
                var val = [];
                for (var i = count - 1; i >= 0; i--) {
                    var v = values.pop();
                    val[i] = v;
                }
                values.push(val);
            }

        };
        var core = Core(imports, buffer);

        function decode () {
            core.decode();
            return values.pop();

        }

        var ubjson = Object.create(core);
        ubjson.decode = decode;
        return ubjson;
    };

    return TYSON;

})();

/*********************************************************************
 *
 * TYSON decoder ends here
 *
 *********************************************************************/

/*********************************************************************/

function processAssembly(url, workerID, data) {
    // All we really need to do is pass this back to the main thread
    self.postMessage({
        type: "rootLoad",
        url: url,
        data: data,
        workerID: workerID
    });
}

function processPreviewJSON(url, workerID, data) {
    // pass back to main thread
    self.postMessage({
        type: 'previewLoad',
        url: url,
        data: data,
        workerID: workerID,
    });
}

function processNCState(url, workerID, data) {
    // All we really need to do is pass this back to the main thread
    self.postMessage({
        type: "rootLoad",
        url: url,
        data: data,
        workerID: workerID
    });
}

function processAnnotation(url, workerID, data) {
    let parts = url.split("/");
    // All we really need to do is pass this back to the main thread
    self.postMessage({
        type: "annotationLoad",
        url: url,
        file: parts[parts.length - 2],
        data: data,
        workerID: workerID
    });
    self.postMessage({
        type: "workerFinish",
        workerID: workerID,
        file: parts[parts.length - 2]
    });
}

/*********************************************************************/

function unindexValues(data, buffers) {
    let numValues = data.pointsIndex.length;
    for (let i = 0; i < numValues; i++) {
        buffers.position[i] = data.values[data.pointsIndex[i]];
        buffers.normals[i] = data.values[data.normalsIndex[i]];
    }
}

function faceLoad(data, buffers) {
    let index = 0;
    let index2 = 0;
    for(let i = 0; i < data.faces.length ; i++){
        let face = {
            start: 0,
            end: 0
        }
        let pIndex = data.faces[i].count * 3
        face.start = index2;
        face.end = index2 + pIndex;
        buffers.faces[data.faces[i].id] = face;
        index2 = index2 + pIndex;
    }
    for (let i = 0; i < data.faces.length; i++) {
        for(let j = 0; j < (data.faces[i]).count; j++){
            if(data.faces[i].color != null){
                buffers.color[index++] = data.faces[i].color[0];
                buffers.color[index++] = data.faces[i].color[1];
                buffers.color[index++] = data.faces[i].color[2];
            }
            else{
                buffers.color[index++] = -1;
                buffers.color[index++] = -1;
                buffers.color[index++] = -1;
            }
        }
    }
}

//This is the data that is getting passed to the data_loader.js line 201
function processShellJSON(url, workerID, dataJSON, signalFinish) {
    // Just copy the data into arrays
    let buffers = {
        position: new Float32Array(dataJSON.pointsIndex.length),
        normals: new Float32Array(dataJSON.pointsIndex.length),
        color: new Float32Array(dataJSON.pointsIndex.length),
        faces: new Object()
    };

    if (dataJSON.values) {
        if (dataJSON.precision) {
            let factor = Math.pow(10, dataJSON.precision);
            let length = dataJSON.values.length;
            for (let i = 0; i < length; i++) {
                dataJSON.values[i] /= factor;
            }
        }
        unindexValues(dataJSON, buffers);
    }
    if (dataJSON.faces)
        faceLoad(dataJSON, buffers);
    let parts = url.split("/");
    self.postMessage({
        type: "shellLoad",
        data: buffers,
        id: dataJSON.id,
        workerID: workerID
    });
    // Do we signal that we are all done
    if (signalFinish) {
        let file = parts[parts.length - 2];
        
        self.postMessage({
            type: "workerFinish",
            workerID: workerID,
            file: file
        });
    }
}

function processBatchJSON(url, workerID, data) {
    let dataJSON = JSON.parse(data);
    let parts = url.split("/");
    self.postMessage({
        type: "parseComplete",
        file: parts[parts.length - 1]
    });
    for (let i = 0; i < dataJSON.shells.length; i++) {
        processShellJSON(url, workerID, dataJSON.shells[i], false);
    }
    self.postMessage({
        type: "workerFinish",
        workerID: workerID,
        file: parts[parts.length - 1]
    });
}

function processBatchTYSON(url, workerID, buffer) {
    let tyson = TYSON(buffer);
    let dataJSON = tyson.decode();
    let parts = url.split("/");
    self.postMessage({
        type: "parseComplete",
        file: parts[parts.length - 1]
    });
    for (let i = 0; i < dataJSON.shells.length; i++) {
        processShellJSON(url, workerID, dataJSON.shells[i], false);
    }
    self.postMessage({
        type: "workerFinish",
        workerID: workerID,
        file: parts[parts.length - 1]
    });
}

/*********************************************************************/


let messageHandler = function(e) {
    // Get the request URL info
    let url = e.data.url;
    let workerID = e.data.workerID;
    
    // Determine data type
    let parts = url.split('.');
    let dataType = e.data.dataType;
    parts = url.split("/");
    
    // define a callback for the "load" event
    // using arrow function to bind 'this' to the higher-level 'self'
    let loadCb = (res) => {
        //TODO: MAKE THIS LESS HARDCODED
        let file = parts.slice(-2, -1).join('/');
        if (file === 'state') {
            file = parts.slice(-2).join('/');
        }
        // What did we get back
        switch(e.data.type) {
            case "annotation":
                processAnnotation(url, workerID, res.text);
                break;
            case "previewShell":
                file = parts.slice(-1).join('/');
                if (file === 'tool') {
                    file = parts.slice(-2).join('/');
                }
                file = 'preview-' + file;
                processPreviewJSON(url, workerID, res.text);
                break;
            case "shell":
                // Try to parse the JSON file
                let dataJSON;
                try {
                     dataJSON = JSON.parse(res.text);
                } catch(ex) {
                    console.log(ex);
                    console.log(res.text);
                    dataJSON = {
                        precision:      2,
                        pointsIndex:    [],
                        normalsIndex:   [],
                        colorsData:     [],
                        values:         []
                    };
                }

                file = dataJSON.id;
                self.postMessage({
                    type: "parseComplete",
                    file: parts[parts.length - 2]
                });
                // Process the Shell data
                processShellJSON(url, workerID, dataJSON, true);
                break;
            case "batch":
                switch (dataType) {
                    case "json":
                        processBatchJSON(url, workerID, res.text);
                        break;
                    case "tyson":
                        processBatchTYSON(url, workerID, res.text);
                        break;
                }
                break;
            case "nc":
                processNCState(url, workerID, res.text);
                break;
            case "assembly":
                processAssembly(url, workerID, res.text);
                break;
            case "cloudassembly":
                processAssembly(url, workerID, res.text);
                break;
            default:
                throw Error("DataLoader.webworker - Invalid request type: " + e.data.type);
                break;
        }

        self.postMessage({type : "loadComplete", file: file });
    }
    
    // define a callback for the "progress" event
    // we use arrow functions here to properly bind 'this'
    let progressCb = (event) => {
        let file = parts[parts.length - 2] + '/' + parts[parts.length - 1];
        let message = { type: "loadProgress", file: file };
        if (event.lengthComputable) {
            message.loaded = event.loaded / event.total * 100.0;
        }
        self.postMessage(message);
    }

    // initialize the GET request
    // This makes all the shell requests and the res is sent to handle
    // handle then sends it to the loadCb for processing
    let req = request.get(url);

    // set the proper request headers for TYSON if needed
    if (dataType == 'tyson'){
        req.accept('arraybuffer');
        req.set('content-type', 'application/arraybuffer');
    }
    
    // now define a handler callback for the response on the request
    // we use arrow functions here to properly bind 'this'
    let handle = (err, res) => {
        // we need to use the response's underlying xhr because events are dispatched to it
        // again using an arrow function to bind 'this' since loadCb needs access to the response
        // any load event that comes in is sent to the loadCb 
        res.xhr.addEventListener("load", () => {loadCb(res);});
        res.xhr.addEventListener("progress", progressCb);
        
        // check for errors and post message accordingly
        if (res.status === 404 || res.status === 403) {
            self.postMessage({
                type: "loadError",
                status: res.status,
                url: url,
                file: parts[parts.length - 2],
                workerID: workerID
            });
        }
        // this catches any other errors that may occur
        else if (err) {
            console.log ("DataLoader.webworker - Error " + err.status + " loading file: " + url);
        }
    }
    
    // actually send the request
    req.end(handle);
    
};

messageHandler = messageHandler.bind(self);
  
self.addEventListener("message", messageHandler, false);

