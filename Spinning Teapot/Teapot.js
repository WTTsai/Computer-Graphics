
var gl;
var canvas;

var shaderProgram;

// Create a place to store the texture coords for the cube mesh
var cubeTCoordBuffer;
var cubeVertexBuffer;
var cubeTriIndexBuffer;

//Create a place to store the texture coord for the teapot mesh
var teapotVertexBuffer;
var teapotVertexNormalBuffer;
var teapotTriIndexBuffer;

// Create ModelView matrix
var mvMatrix = mat4.create();

// Create Projection matrix
var pMatrix = mat4.create();

// Create Normal matrix
var nMatrix = mat3.create();

var mvMatrixStack = [];

// Create a place to store the texture
var cubeTexture;

// View parameters
var eyePt = vec3.fromValues(0.0,0.0, 8.0);
var viewDir = vec3.fromValues(0.0,0.0, -0.4);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.5);

//global quat for user interaction
var globalQuat = quat.create();

// For animation 
var then =0;
var modelXRotationRadians = degToRad(0);
var modelYRotationRadians = degToRad(0);

/**
* Pass the model view matrix to the shader program
* @return None
*/
function uploadModelViewMatrixToShader() {
	gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
* Pass the projection matrix to the shader program
* @return None
*/
function uploadProjectionMatrixToShader() {
	gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

/**
* Pass the normal matrix to the shader program
* @return None
*/
function uploadNormalMatrixToShader() {
    mat3.fromMat4(nMatrix,mvMatrix);
    mat3.transpose(nMatrix,nMatrix);
    mat3.invert(nMatrix,nMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

/**
* Manipulate lighting information for Phong Model
* @return None
*/
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

/**
* Pass the rotation matrix to the shader program so teapot correctly reflects as it rotates
* @return None
*/
function uploadrotMatrixToShader(rotMatrix){
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "urotMatrix"), false, rotMatrix);
}

/**
* Push matrix to stack for hieroarchial modeling
* @return None
*/
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

/**
* Pop matrix from stack for hieroarchial modeling
* @return None
*/
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
    	throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/**
* Upload model matricies to the shader program
* @return None
*/
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
	uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

/**
* Converts from degrees to radians
* @param angle in degrees
* @return angle in radians
*/
function degToRad(degrees) {
	return degrees * Math.PI / 180;
}

/**
 * Create WebGL context from HTML canvas
 * @param canvas
 * @return {object}
 */
function createGLContext(canvas) {
	var names = ["webgl", "experimental-webgl"];
	var context = null;
	for (var i=0; i < names.length; i++) {
		try {
		  context = canvas.getContext(names[i]);
		} catch(e) {}
		if (context) {
		  break;
		}
	}
	if (context) {
		context.viewportWidth = canvas.width;
		context.viewportHeight = canvas.height;
	} else {
		alert("Failed to create WebGL context!");
	}
	return context;
}

/**
 * Load shader specified in the HTML page
 * @param id : shader ID specified 
 * @return compile shader object
 */
function loadShaderFromDOM(id) {
	var shaderScript = document.getElementById(id);

	// If we don't find an element with the specified id
	// we do an early exit 
	if (!shaderScript) {
		return null;
	}

	// Loop through the children for the found DOM element and
	// build up the shader source code as a string
	var shaderSource = "";
	var currentChild = shaderScript.firstChild;
	while (currentChild) {
		if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
			shaderSource += currentChild.textContent;
		}
		currentChild = currentChild.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, shaderSource);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	} 
	return shader;
}

/**
* Initialize the shaders.
* @return None
*/
function setupShaders() {
	vertexShader = loadShaderFromDOM("shader-vs");
	fragmentShader = loadShaderFromDOM("shader-fs");

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Failed to setup shaders");
	}

	gl.useProgram(shaderProgram);

	// Enable vertex position
	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	console.log("Vertex attrib: ", shaderProgram.vertexPositionAttribute);
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	
	// Enable vertex normals
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

	// Enable matrix manipulations
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	
	// Enable Phong Shading options
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
	shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
	shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
	shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
	shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}

/**
 * Generates cubes and stores it in buffers
 * @return none
 */
function setupCubeBuffers() {

  // Create a buffer for the cube's vertices.

  cubeVertexBuffer = gl.createBuffer();

  // Select the cubeVerticesBuffer as the one to apply vertex
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);

  // Now create an array of vertices for the cube.

  var vertices = [
    // Front face
    -100.0, -100.0,  100.0,
     100.0, -100.0,  100.0,
     100.0,  100.0,  100.0,
    -100.0,  100.0,  100.0,

    // Back face
    -100.0, -100.0, -100.0,
    -100.0,  100.0, -100.0,
     100.0,  100.0, -100.0,
     100.0, -100.0, -100.0,

    // Top face
    -100.0,  100.0, -100.0,
    -100.0,  100.0,  100.0,
     100.0,  100.0,  100.0,
     100.0,  100.0, -100.0,

    // Bottom face
    -100.0, -100.0, -100.0,
     100.0, -100.0, -100.0,
     100.0, -100.0,  100.0,
    -100.0, -100.0,  100.0,

    // Right face
     100.0, -100.0, -100.0,
     100.0,  100.0, -100.0,
     100.0,  100.0,  100.0,
     100.0, -100.0,  100.0,

    // Left face
    -100.0, -100.0, -100.0,
    -100.0, -100.0,  100.0,
    -100.0,  100.0,  100.0,
    -100.0,  100.0, -100.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
 
 

  cubeTCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);

  var textureCoordinates = [
    // Front
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Back
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Top
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Bottom
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Right
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Left
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                gl.STATIC_DRAW);

  // Build the element array buffer; this specifies the indices
  // into the vertex array for each face's vertices.

  cubeTriIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  var cubeVertexIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ]

  // Now send the element array to GL

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
  //readTextFile("teapot_0.obj", setupTeapotBuffers);
}

/**
 * Draw cube with gl.triangles using data from the cube buffers
 * @return none
 */
function drawCube(){
    //check if the shading is for skybox or not
    gl.uniform1f(gl.getUniformLocation(shaderProgram, "uSkybox"), true);
	
	// Draw the cube by binding the array buffer to the cube's vertices array
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

	// Specify the texture to map onto the faces.
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
	gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

	// Draw the cube.
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

/**
 * Generates teapot and stores it in buffers
 * @param file to read the coords. from
 * @return none
 */
function setupTeapotBuffers(text_file){
	var vertices = [];
	var faces = [];
    var normals = [];
    
	// read file line by line
	var lines = text_file.split("\n");
    for (var i = 0; i < lines.length; i++){
		list = lines[i].split(' ');
		
		// Push vertex coordineates into vertices array
		if (list[0] == 'v'){
			vertices.push(parseFloat(list[1]));
			vertices.push(parseFloat(list[2]));
			vertices.push(parseFloat(list[3]));
		}
		// Push face coordinates into face array
		else if(list[0] == 'f'){
			faces.push(parseInt(list[2])-1);
			faces.push(parseInt(list[3])-1);
			faces.push(parseInt(list[4])-1);
		}
	}
	
	// bind vertex data
	teapotVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	teapotVertexBuffer.numItems = (vertices.length)/3;
    
    // bind face data
    teapotTriIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotTriIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);
	teapotTriIndexBuffer.numItems = (faces.length)/3;
	
	// calculate normals
	for (var i=0; i < (vertices.length)/3; i++){
		normals.push(0);
		normals.push(0);
		normals.push(0);
	}
    
	// Calculate vertex normals
	calculateNormals(vertices, faces, normals);
	// bind normal data
	teapotVertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    teapotVertexNormalBuffer.itemSize = 3;
    teapotVertexNormalBuffer.numItems = (faces.length)/3;
}

/**
* Calculates the vertex normals by calculating the surface normals
*   for each face of the teapot, and average the surface normals
*   of the faces it is a part of.
* @param vertices Vertex array represent the X,Y,Z coordinates of each vertex in space
* @param faces Face array specify which verticies constitute the triangle face
* @param normals Normal array specify the X, Y, Z components of each face's normal vecotr
* @return None
*/
function calculateNormals(vertices, faces, normals){
    var faceNormals = [];
    
    // calculate normals for each triangle
    for (var i = 0; i < faces.length; i+= 3){
        var index0 = faces[i];
        var index1 = faces[i+1];
        var index2 = faces[i+2];
        var vertex0 = vec3.fromValues(vertices[3*index0], vertices[(3*index0)+1], vertices[(3*index0)+2]);
        var vertex1 = vec3.fromValues(vertices[3*index1], vertices[(3*index1)+1], vertices[(3*index1)+2]);
        var vertex2 = vec3.fromValues(vertices[3*index2], vertices[(3*index2)+1], vertices[(3*index2)+2]);
        var para_1 = vec3.create();
        var para_2 = vec3.create();
        var normal = vec3.create();
        vec3.subtract(para_1, vertex2, vertex0);
        vec3.subtract(para_2, vertex1, vertex0);
        vec3.cross(normal, para_2, para_1);
        vec3.normalize(normal, normal);
        faceNormals.push(normal[0]);
        faceNormals.push(normal[1]);
        faceNormals.push(normal[2]);
    }
	    
    // initialize array to 0s
    var count = []
    for (var i = 0; i < vertices.length; i+=3)
        count.push(0);
    
    // calculate sum of the surface normal vectors
    for (var i = 0; i < faces.length; i+=3){
        var v1 = faces[i + 0]
        var v2 = faces[i + 1]
        var v3 = faces[i + 2]
        // iterate over each vertex in triangle
        count[v1] += 1
        count[v2] += 1
        count[v3] += 1
        
        // vertex 0
        normals[3*v1 + 0] += faceNormals[i + 0];
        normals[3*v1 + 1] += faceNormals[i + 1];
        normals[3*v1 + 2] += faceNormals[i + 2];
        
        // vertex 1
        normals[3*v2 + 0] += faceNormals[i + 0];
        normals[3*v2 + 1] += faceNormals[i + 1];
        normals[3*v2 + 2] += faceNormals[i + 2];
        
        // vertex 2
        normals[3*v3 + 0] += faceNormals[i + 0];
        normals[3*v3 + 1] += faceNormals[i + 1];
        normals[3*v3 + 2] += faceNormals[i + 2];
    }
	    
    // average and normalized each vecor  
    for (var i = 0; i < vertices.length; i+=3){
        //average by the number it appears
        normals[i + 0] = normals[i + 0]/count[i/3];
        normals[i + 1] = normals[i + 1]/count[i/3];
        normals[i + 2] = normals[i + 2]/count[i/3];
        
        // normalize the normal vector
        var normal = vec3.fromValues(normals[i + 0], normals[i + 1], normals[i + 2]);
        var normalized = vec3.create();
        vec3.normalize(normalized, normal);
        
        // store the normalized vector
        normals[i + 0] = normalized[0];
        normals[i + 1] = normalized[1];
        normals[i + 2] = normalized[2];
    }
}

/**
 * Draw Teapot with gl.triangles using data from the teapot buffers
 * @return none
 */
function drawTeapot(){
    //check if the shading is for skybox or not and pass in the viewdir to shader
	gl.uniform1f(gl.getUniformLocation(shaderProgram, "uSkybox"), false);
	gl.uniform3fv(gl.getUniformLocation(shaderProgram, "viewDir"), viewDir);
	
	// Draw teapot by binding the array buffer to the teapot vertices array
	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
		
	gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexNormalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);  

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotTriIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, 6768, gl.UNSIGNED_SHORT, 0);
}

/**
* Setup the viewing, textures, lihts, and draw the cube and the teapot
* @return None
*/
function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(80), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
        
 
    // Setup camera 
    mvPushMatrix();
	var rotMatrix = mat4.create();
	mat4.rotateY(rotMatrix, rotMatrix, modelYRotationRadians); 
	uploadrotMatrixToShader(rotMatrix);
    vec3.set(transformVec,0.0,0.0,-10.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    setMatrixUniforms();
	
    vec3.add(viewPt, eyePt, viewDir);
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);
    
	//setup light value
	uploadLightsToShader([0,20,0],[0.0,0.0,0.0],[0.5,0.5,0.5],[0.5,0.5,0.5]);
	
	//Draw skybox and teapot
    drawCube();
    mat4.rotateY(mvMatrix,mvMatrix,modelYRotationRadians)
    drawTeapot();
	
	//pop the matrix 
    mvPopMatrix();
  
}

/**
* Function to animate the scene 
* @return None
*/
function animate() {
    if (then==0)
    {
    	then = Date.now();
    }
    else
    {
		now=Date.now();
		// Convert to seconds
		now *= 0.001;
		// Subtract the previous time from the current time
		var deltaTime = now - then;
		// Remember the current time for the next frame.
		then = now;  

    }
}

/**
* Function to setup the cubemap texture for skybox and teapot.
* @return None
*/
function setupCubeMap() {
    // Initialize the Cube Map, and set its parameters
    cubeTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture); 
	
	// Set texture parameters
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, 
          gl.LINEAR); 
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER,    
          gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    
    // Load up each cube map face
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_X, 
          cubeTexture, 'pos-x.jpg');  
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,    
         cubeTexture, 'neg-x.jpg');    
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 
        cubeTexture, 'pos-y.jpg');  
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
       cubeTexture, 'neg-y.jpg');  
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 
       cubeTexture, 'pos-z.jpg');  
    loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 
       cubeTexture, 'neg-z.jpg'); 
}

/**
* Function to bind images to a specific side of the cubemap
* @param gl WebGL context
* @param target Which side of the cubemap to place the image on
* @param texture Cubemap to add the texture to
* @param url Source of the file
* @return None
*/
function loadCubeMapFace(gl, target, texture, url){
    var image = new Image();
    image.onload = function()
    {
    	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
        gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }
    image.src = url;
}

/**
* Verify if a given value is a power of 2 
* @param value to check
* @return boolean 
*/
function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}

/**
* Function to load the image to a face of the cubemap. Determines whether an image is of power of 2
*	size or not and then acts correspondingly
* @param Image to be added to side
* @param Cubemap to add image to
* @return None
*/
function handleTextureLoaded(image, texture) {
  console.log("handleTextureLoaded, image = " + image);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  // Check if the image is a power of 2 in both dimensions.
  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
     // Yes, it's a power of 2. Generate mips.
     gl.generateMipmap(gl.TEXTURE_2D);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
     console.log("Loaded power of 2 texture");
  } else {
     // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     console.log("Loaded non-power of 2 texture");
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

/**
* Apply new rotation to the current global quat and normalized it
* @param roataionRate, the rate it rotates 
* @param rotAxis, the axis rotation occurs
* @return None
*/

function quatRotation(rotationRate, rotAxis){
    // Create temp quat to apply rotation
    var tempQuat = quat.create();
    quat.setAxisAngle(tempQuat, rotAxis, rotationRate);
    quat.normalize(tempQuat, tempQuat);
    quat.mul(globalQuat, tempQuat, globalQuat);
    quat.normalize(globalQuat, globalQuat);
}

//Array to store all the currently pressed keys
var currentlyPressedKeys = {};

/**
* Handle user input 
* @param event data structure that contains the previous key event
* @return None
*/
function handleKeyDown(event) {
        currentlyPressedKeys[event.keyCode] = true;
}

/**
* Handle user input 
* @param event data structure that contains the previous key event
* @return None
*/
function handleKeyUp(event) {
        currentlyPressedKeys[event.keyCode] = false;
}

/**
* Handle key events from the user
* @return None
*/
function handleKeys(){
	// left arrow key to orbit left
    if (currentlyPressedKeys[37]){
        // rotate around origUp
        quatRotation(-0.05, [0, 1, 0]);
        
        vec3.transformQuat(eyePt, [0, 0, 8], globalQuat);
		vec3.normalize(viewDir, eyePt);
        vec3.scale(viewDir, viewDir, -1);
    }
    // right arrow key to orbite right
    else if (currentlyPressedKeys[39]){
        // rotate around origUp
        quatRotation(0.05, [0, 1, 0]);
        
        vec3.transformQuat(eyePt, [0, 0, 8], globalQuat);
		vec3.normalize(viewDir, eyePt);
		vec3.scale(viewDir, viewDir, -1);
    }
	// Up arrow key to rotate teapot right
	else if (currentlyPressedKeys[38]){
		modelYRotationRadians += 0.05;
       
	}
	// Down arrow key to rotate teapot left
	else if (currentlyPressedKeys[40]){
		modelYRotationRadians -= 0.05;
	}
}

/**
* Starts the program and animation
* @return None
*/
function startup() {
	canvas = document.getElementById("myGLCanvas");
	gl = createGLContext(canvas);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);

	// set up event listener for keystrokes
	document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

	// pipeline to render the scene
	setupShaders();
	setupCubeBuffers();
    //read in teapot file and process it
    readTextFile("teapot_0.obj", setupTeapotBuffers);
	setupCubeMap();
	tick();
}

/**
* Draw each frame
* @return None
*/
function tick() {
    requestAnimFrame(tick);
    handleKeys();
    draw();
    animate();
}

