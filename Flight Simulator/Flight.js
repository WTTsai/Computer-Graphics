var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

// Create a place to store terrain geometry
var tVertexPositionBuffer;

//Create a place to store normals for shading
var tVertexNormalBuffer;

// Create a place to store the terrain triangles
var tIndexTriBuffer;

//Create a place to store the traingle edges
var tIndexEdgeBuffer;

//Create a place to store vertext color
var vertexColorBuffer;

// View parameters
var eyePt = vec3.fromValues(0.0,0.0, 0.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

// keep track of the last time movement was processed, in microseconds
var lastFrame = -1;

//quat for pitch and roll, and a global quat to track the work so far. 
var globalQuat = quat.create();
var cameraPitch = quat.fromValues(0.0, 0.0, 0.0, 1.0);
var cameraRoll = quat.fromValues(0.0, 0.0, 0.0, 1.0);


//-------------------------------------------------------------------------
function setupTerrainBuffers() {
    
    var vTerrain=[];
    var fTerrain=[];
    var nTerrain=[];
    var eTerrain=[];
    var colors = [];
    var gridN= 16;
    var minX = -2;
    var maxX = 2;
    var minY = -1.5;
    var maxY = 1;
    
    var numT = terrainFromIteration(gridN, minX, maxX, minY, maxY, vTerrain, fTerrain, nTerrain);
    
    //diamond_square algorithm to set up the terrain
    diamondsquare(vTerrain, minX, maxX, minY, maxY, 6);
    
    //calculate the vertex normal for lighting 
    n_array = vertex_normal(fTerrain, vTerrain, nTerrain);
    
    console.log("Generated ", numT, " triangles"); 
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(n_array),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify faces of the terrain 
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;
    //Setup Edges
     generateLinesFromIndexedTriangles(fTerrain,eTerrain);  
     tIndexEdgeBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(eTerrain),
                  gl.STATIC_DRAW);
     tIndexEdgeBuffer.itemSize = 1;
     tIndexEdgeBuffer.numItems = eTerrain.length;
   
  //Color in the terrain based on height
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  for(var k = 0; k < (vTerrain.length)-2; k+=3){ 
      height = vTerrain[k+2];

  if(height <= 0.35 ){
        colors.push(0.368);
        colors.push(0.3568);
        colors.push(0.1137);
        colors.push(1.0);
    
       
   }

   else {
        colors.push(0.5216);
        colors.push(0.2666);
        colors.push(0.1490);
        colors.push(1.0);
      
    }
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = (gridN+1) * (gridN+1);       
}

//-------------------------------------------------------------------------
function drawTerrain(){
 gl.polygonOffset(0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 //Bind color buffer    
 gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);    
 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
 gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT,0);  
}

//-------------------------------------------------------------------------

function drawTerrainEdges(){
 gl.polygonOffset(1,1);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
 gl.drawElements(gl.LINES, tIndexEdgeBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
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

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);


  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}


//-------------------------------------------------------------------------
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
function setupBuffers() {
    setupTerrainBuffers();
}

//----------------------------------------------------------------------------------
function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 400.0);
    
   
    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view 
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);   
 
    //Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec,0.0, 0.4,-5.5);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-60));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(-50));     
    setMatrixUniforms();
    
    var lightPosEye4 = vec4.fromValues(0.0, 0.5, 1.0, 1.0);
    lightPosEye4 = vec4.transformMat4(lightPosEye4, lightPosEye4, mvMatrix);
    var lightPosEye = vec3.fromValues(lightPosEye4[0], lightPosEye4[1],lightPosEye4[2]);
    
    if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
    {      
      uploadLightsToShader(lightPosEye,[0.0,0.0,0.0],[0.5,0.5,0.0],[0.0,0.0,0.0]);
      drawTerrain();
    }
    
    if(document.getElementById("wirepoly").checked){
      uploadLightsToShader(lightPosEye,[0.0,0.0,0.0],[0.0,0.0,0.0],[0.0,0.0,0.0]);
      drawTerrainEdges();
    }

    if(document.getElementById("wireframe").checked){
      uploadLightsToShader(lightPosEye,[1.0,1.0,1.0],[0.0,0.0,0.0],[0.0,0.0,0.0]);
      drawTerrainEdges();
    }
    mvPopMatrix();
  
}

//----------------------------------------------------------------------------------
function animate() {
    var current = new Date().getTime();
	if(lastFrame == -1)
		lastFrame = current;
	// we want the time in seconds for simplicity
	var elapsed = (current - lastFrame) / 10000.0;
	lastFrame = current;

}

//----------------------------------------------------------------------------------
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.34902, 0.547059, 0.847059, 1.0);
  gl.enable(gl.DEPTH_TEST);
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  tick();
}

//----------------------------------------------------------------------------------
function tick() {
    requestAnimFrame(tick);
    handleKeys();
    draw();
    animate();
}

//-------------------------------------------------------------------------
function terrainFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray,normalArray)
{
    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {
           vertexArray.push(minX+deltaX*j);
           vertexArray.push(minY+deltaY*i);
           vertexArray.push(0);
           
           normalArray.push(0);
           normalArray.push(0);
           normalArray.push(0);
       }
   //initialized height of four corners to a random number
    for(var i = 0; i<(vertexArray.length)-2; i+=3){
        if((vertexArray[i] == minX) && (vertexArray[i+1] == maxY)){
            vertexArray[i+2] = Math.random()/10;
        }
        else if ((vertexArray[i] == minX) && (vertexArray[i+1] == minY)){
            vertexArray[i+2] = Math.random()/5;
        }
        else if((vertexArray[i] == maxX) && (vertexArray[i+1] == maxY)){
            vertexArray[i+2] = Math.random()/10;
        }
        else if((vertexArray[i] == maxX) && (vertexArray[i+1] == minY)){
            vertexArray[i+2] = Math.random()/5;
        }
        else{
         
        }
    }
    var numT=0;
    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2;
       }
    return numT;
}
//-------------------------------------------------------------------------
function generateLinesFromIndexedTriangles(faceArray,lineArray)
{
    numTris=faceArray.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        lineArray.push(faceArray[fid]);
        lineArray.push(faceArray[fid+1]);
        
        lineArray.push(faceArray[fid+1]);
        lineArray.push(faceArray[fid+2]);
        
        lineArray.push(faceArray[fid+2]);
        lineArray.push(faceArray[fid]);
    }
}

//sqare step of diamond-square algorithm
function squarestep(vertexArray, minX, maxX, minY, maxY)
{
    var newpoint = [];
    var newheight = 0;
    for(var i = 0; i<(vertexArray.length)-2; i+=3){
        if((vertexArray[i] == minX) && (vertexArray[i+1] == maxY)){
                newheight+=vertexArray[i+2];
            }
            else if ((vertexArray[i] == minX) && (vertexArray[i+1] == minY)){
                newheight+=vertexArray[i+2];
            }
            else if((vertexArray[i] == maxX) && (vertexArray[i+1] == maxY)){
                newheight+=vertexArray[i+2];
            }
            else if((vertexArray[i] == maxX) && (vertexArray[i+1] == minY)){
                newheight+=vertexArray[i+2];
            }
     }
    newpoint[0] = (minX+maxX)/2;
    newpoint[1] = (minY+maxY)/2;
    newpoint[2] = newheight/4 + (Math.random()/5);
    for(var i = 0; i<(vertexArray.length)-2; i+=3){
        if((vertexArray[i] == newpoint[0]) && (vertexArray[i+1] == newpoint[1])){
                vertexArray[i+2] = newpoint[2];
            }
     }
    return newpoint;
}

//diamond step of diamond-square algorithm
function diamondstep(vertexArray, newpoint, minX, maxX, minY, maxY)
{
    var new_diamond = [];
    var diamond_1 = 0;
    var diamond_2 = 0;
    var diamond_3 = 0;
    var diamond_4 = 0;
    for(var i = 0; i<(vertexArray.length)-2; i+=3){
        if((vertexArray[i] == minX) && (vertexArray[i+1] == maxY)){
                diamond_3+=vertexArray[i+2];
                diamond_4+=vertexArray[i+2];
            }
            else if ((vertexArray[i] == minX) && (vertexArray[i+1] == minY)){
                diamond_2+=vertexArray[i+2];
                diamond_3+=vertexArray[i+2];
                
            }
            else if((vertexArray[i] == maxX) && (vertexArray[i+1] == maxY)){
                diamond_1+=vertexArray[i+2];
                diamond_4+=vertexArray[i+2];
            }
            else if((vertexArray[i] == maxX) && (vertexArray[i+1] == minY)){
                diamond_1+=vertexArray[i+2];
                diamond_2+=vertexArray[i+2];
            }
            else if((vertexArray[i] == newpoint[0]) && (vertexArray[i+1] == newpoint[1])){
                diamond_1+=vertexArray[i+2];
                diamond_2+=vertexArray[i+2];
                diamond_3+=vertexArray[i+2];
                diamond_4+=vertexArray[i+2];
            }
    }
     new_diamond[0] = maxX;
     new_diamond[1] = newpoint[1];
     new_diamond[2] = (diamond_1)/4 - (Math.random()/5);
     new_diamond[3] = newpoint[0];
     new_diamond[4] = minY;
     new_diamond[5] = (diamond_2)/4 + (Math.random()/3);
     new_diamond[6] = minX;
     new_diamond[7] = newpoint[1];
     new_diamond[8] = (diamond_3)/4 - (Math.random()/5);
     new_diamond[9] = newpoint[0];
     new_diamond[10] = maxY;
     new_diamond[11] = (diamond_4)/4 + (Math.random()/3);
     for(var j = 0; j<(vertexArray.length)-2; j+=3){  
         for(var i = 0; i<(vertexArray.length)-2; i+=3){
            if((vertexArray[i] == new_diamond[j]) && (vertexArray[i+1] == new_diamond[j+1])){
                    vertexArray[i+2] = new_diamond[j+2];
                }
        }
     }
    return new_diamond;
    
    
}

//recusive diamond-diamond square algorithm to generate the terrain
//argument repeat to stop the recursive function after number of steps
function diamondsquare(vertexArray, minX, maxX, minY, maxY, repeat){
    repeat = repeat - 1;
    var newterr = squarestep(vertexArray, minX, maxX, minY, maxY);
    var newdia = diamondstep(vertexArray, newterr, minX, maxX, minY, maxY);
    
    if(repeat == 0){
        return;
    }
    else{
    //Quat I
    diamondsquare(vertexArray, newdia[9], newdia[0], newdia[1], newdia[10], repeat);
    //Quat II
    diamondsquare(vertexArray, newdia[9], newdia[0], newdia[4], newdia[1], repeat);
    //Quat III
    diamondsquare(vertexArray, newdia[6], newdia[3], newdia[4], newdia[7], repeat);
    //Quat IV
    diamondsquare(vertexArray, newdia[6], newdia[3], newdia[7], newdia[10], repeat);
    }
    
}

//roll function using quaternion
function camera_roll(rot_deg){
    quat.setAxisAngle(cameraRoll, [0, 0, 1], degToRad(rot_deg));
    quat.normalize(globalQuat, cameraRoll);
    quat.mul(globalQuat, globalQuat, cameraRoll);
    quat.normalize(globalQuat, globalQuat);
    vec3.transformQuat(up, up, globalQuat);
    
}

//pitch function using quaternion
function camera_pitch(rot_deg){
    quat.setAxisAngle(cameraPitch, [1, 0, 0], degToRad(rot_deg));
    quat.normalize(globalQuat, cameraPitch);
    quat.mul(globalQuat, globalQuat, cameraPitch);
    quat.normalize(globalQuat, globalQuat);
    vec3.transformQuat(viewDir, viewDir, globalQuat);
}

//normalized each triangle to pass in to lighting 
function vertex_normal(faceArray, vertexArray, nTerrain){
    var n_array = [];
    for (var i = 0; i < faceArray.length; i+= 3){
        var index0 = faceArray[i];
        var index1 = faceArray[i+1];
        var index2 = faceArray[i+2];
        var vertex0 = vec3.fromValues(vertexArray[3*index0], vertexArray[(3*index0)+1], vertexArray[(3*index0)+2]);
        var vertex1 = vec3.fromValues(vertexArray[3*index1], vertexArray[(3*index1)+1], vertexArray[(3*index1)+2]);
        var vertex2 = vec3.fromValues(vertexArray[3*index2], vertexArray[(3*index2)+1], vertexArray[(3*index2)+2]);
        var para_1 = vec3.create();
        var para_2 = vec3.create();
        var normal = vec3.create();
        vec3.subtract(para_1, vertex2, vertex0);
        vec3.subtract(para_2, vertex1, vertex0);
        vec3.cross(normal, para_2, para_1);
        vec3.normalize(normal, normal);
        n_array.push(normal[0]);
        n_array.push(normal[1]);
        n_array.push(normal[2]);
        // add face normal to each vertex that contributes to it
        nTerrain[3*index0] += normal[0];
        nTerrain[(3*index0)+1] += normal[1];
        nTerrain[(3*index0)+2] += normal[2];
        nTerrain[3*index1] += normal[0];
        nTerrain[(3*index1)+1] += normal[1];
        nTerrain[(3*index1)+2] += normal[2];
        nTerrain[3*index2] += normal[0];
        nTerrain[(3*index2)+1] += normal[1];
        nTerrain[(3*index2)+2] += normal[2];
    }
   
    return nTerrain;
    
}

//Code to handle user interaction
var currentlyPressedKeys = {};

function handleKeyDown(event) {
        currentlyPressedKeys[event.keyCode] = true;
}


function handleKeyUp(event) {
        currentlyPressedKeys[event.keyCode] = false;
}

//Plane moving at constant speed of 0.002
var speed = 0.002;
function handleKeys() {

    if (currentlyPressedKeys[37] || currentlyPressedKeys[65]){
        // left cursor or A
        camera_roll(-0.5);
        console.log("Roll Left");
    } else if (currentlyPressedKeys[39] || currentlyPressedKeys[68]) {
        // right cursor or D
        camera_roll(0.5);
        console.log("Roll Right");
    } else if (currentlyPressedKeys[38] || currentlyPressedKeys[87]) {
        // up cursor or W
        camera_pitch(0.5);
        console.log("Pitch Up");
    } else if (currentlyPressedKeys[40] || currentlyPressedKeys[83]) {
        // down cursor or S
        camera_pitch(-0.5);
        console.log("Pitch Down");
    } else if (currentlyPressedKeys[90]) {
        // z key
        speed += 0.002;
        console.log("Accerlating");
    } else if (currentlyPressedKeys[88]) {
        // x key
        speed = 0.002;
        console.log("Decelerating");
    }
    eyePt[2]-=speed;

}



