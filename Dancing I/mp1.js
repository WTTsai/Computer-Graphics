var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;



// Create a place to store vertex colors
var vertexColorBuffer;

var mvMatrix = mat4.create();
var rotAngle = 0;
var lastTime = 0;
//var translation = vec3.create();

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//For rotation animation
function degToRad(degrees) {
         return degrees * Math.PI /180;
}


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
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  
}

//Set up all the vertices for the badge
function setupBuffers() {
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  var triangleVertices = [
         //Blue parts of the badge
         -0.8, 0.6,  0.0,
         -0.8,  0.9,  0.0,
         -0.6, 0.6,  0.0,
          
         -0.6, 0.6,  0.0,
         -0.8,  0.9,  0.0,
         -0.3, 0.6, 0.0,
      
         -0.8,  0.9,  0.0,
         -0.3, 0.6, 0.0,      
         0.8, 0.9, 0.0, 
               
        -0.3, 0.6, 0.0,      
         0.8, 0.9, 0.0, 
         0.3, 0.6, 0.0,
      
         0.3, 0.6, 0.0,
         0.8, 0.9, 0.0, 
         0.6, 0.6, 0.0,
      
         0.8, 0.9, 0.0, 
         0.8, 0.6, 0.0,
         0.6, 0.6, 0.0,
      
         0.3, 0.6, 0.0,
         0.3, 0.4, 0.0,
         0.6, 0.6, 0.0,
      
         0.3, 0.4, 0.0,
         0.6, 0.6, 0.0,
         0.3, 0.0, 0.0,
      
         0.6, 0.6, 0.0,
         0.3, 0.0, 0.0, 
         0.6, -0.2, 0.0,
      
         0.3, 0.0, 0.0, 
         0.6, -0.2, 0.0,
         0.3, -0.2, 0.0,
      
         0.3, 0.4, 0.0, 
         0.1, 0.4, 0.0, 
         0.1, 0.0, 0.0,
      
         0.3, 0.4, 0.0,
         0.1, 0.0, 0.0, 
         0.3, 0.0, 0.0,
      
         -0.3, 0.6, 0.0,
         -0.3, 0.4, 0.0,
         -0.6, 0.6, 0.0,
      
         -0.3, 0.4, 0.0,
         -0.6, 0.6, 0.0,
         -0.3, 0.0, 0.0,
      
         -0.6, 0.6, 0.0,
         -0.3, 0.0, 0.0, 
         -0.6, -0.2, 0.0,
      
         -0.3, 0.0, 0.0, 
         -0.6, -0.2, 0.0,
         -0.3, -0.2, 0.0,
      
         -0.3, 0.4, 0.0, 
         -0.1, 0.4, 0.0, 
         -0.1, 0.0, 0.0,
      
         -0.3, 0.4, 0.0,
         -0.1, 0.0, 0.0, 
         -0.3, 0.0, 0.0,
      
         //Orange part of the badge
         -0.6, -0.3, 0.0,
         -0.5, -0.3, 0.0,
         -0.6, -0.5, 0.0,
      
         -0.5, -0.3, 0.0,
         -0.6, -0.5, 0.0,
         -0.5, -0.55, 0.0,
      
         -0.4, -0.3, 0.0,
         -0.3, -0.3, 0.0,
         -0.4, -0.6, 0.0,
      
         -0.4, -0.6, 0.0,
         -0.3, -0.3, 0.0,
         -0.3, -0.65, 0.0,
      
         -0.2, -0.3, 0.0,
         -0.075, -0.3, 0.0,
         -0.2, -0.7, 0.0,
      
         -0.2, -0.7, 0.0,
         -0.075, -0.75, 0.0,
         -0.075, -0.3, 0.0,
      
         0.2, -0.7, 0.0,
         0.075, -0.75, 0.0,
         0.075, -0.3, 0.0,
      
         0.2, -0.3, 0.0,
         0.075, -0.3, 0.0,
         0.2, -0.7, 0.0,
      
         0.4, -0.3, 0.0,
         0.3, -0.3, 0.0,
         0.4, -0.6, 0.0,
      
         0.4, -0.6, 0.0,
         0.3, -0.3, 0.0,
         0.3, -0.65, 0.0,
      
         0.6, -0.3, 0.0,
         0.5, -0.3, 0.0,
         0.6, -0.5, 0.0,
      
         0.5, -0.3, 0.0,
         0.6, -0.5, 0.0,
         0.5, -0.55, 0.0
      
         
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = 90;
    
  //Color in the badge    
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  var colors = [
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        0.14, 0.14, 0.30, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0,
        1.0, 0.25, 0.0, 1.0  
      
      
    ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = 90;  
}


function draw() { 
  var transformVec = vec3.create();
  var scaleformVec = vec3.create();
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);  
  mat4.identity(mvMatrix);
  //Translate the matrix
  vec3.set(transformVec, 0.0, 0.0,  -0.2)
  mat4.translate(mvMatrix, mvMatrix,transformVec);
  //Rotate the matrix 
  mat4.rotateY(mvMatrix, mvMatrix, degToRad(rotAngle));
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
  
  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
}

var scalar = 0;
function animate() {
   //degree to rotate around Y axis     
   var timeNow = new Date().getTime();
    if (lastTime != 0) {
        var elapsed = timeNow - lastTime;    
        rotAngle= (rotAngle-1.0) % 360;
    }
    lastTime = timeNow;
    
    scalar += 0.1;
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
        var triangleVertices = [
          //Blue Part 
         -0.8, 0.6,  0.0,
         -0.8,  0.9,  0.0,
         -0.6, 0.6,  0.0,
      
    
         -0.6, 0.6,  0.0,
         -0.8,  0.9,  0.0,
         -0.3, 0.6, 0.0,
      
         -0.8,  0.9,  0.0,
         -0.3, 0.6, 0.0,      
         0.8, 0.9, 0.0, 
               
        -0.3, 0.6, 0.0,      
         0.8, 0.9, 0.0, 
         0.3, 0.6, 0.0,
      
         0.3, 0.6, 0.0,
         0.8, 0.9, 0.0, 
         0.6, 0.6, 0.0,
      
         0.8, 0.9, 0.0, 
         0.8, 0.6, 0.0,
         0.6, 0.6, 0.0,
      
         0.3, 0.6, 0.0,
         0.3, 0.4, 0.0,
         0.6, 0.6, 0.0,
      
         0.3, 0.4, 0.0,
         0.6, 0.6, 0.0,
         0.3, 0.0, 0.0,
      
         0.6, 0.6, 0.0,
         0.3, 0.0, 0.0, 
         0.6, -0.2, 0.0,
      
         0.3, 0.0, 0.0, 
         0.6, -0.2, 0.0,
         0.3, -0.2, 0.0,
      
         0.3, 0.4, 0.0, 
         0.1, 0.4, 0.0, 
         0.1, 0.0, 0.0,
      
         0.3, 0.4, 0.0,
         0.1, 0.0, 0.0, 
         0.3, 0.0, 0.0,
      
         -0.3, 0.6, 0.0,
         -0.3, 0.4, 0.0,
         -0.6, 0.6, 0.0,
      
         -0.3, 0.4, 0.0,
         -0.6, 0.6, 0.0,
         -0.3, 0.0, 0.0,
      
         -0.6, 0.6, 0.0,
         -0.3, 0.0, 0.0, 
         -0.6, -0.2, 0.0,
      
         -0.3, 0.0, 0.0, 
         -0.6, -0.2, 0.0,
         -0.3, -0.2, 0.0,
      
         -0.3, 0.4, 0.0, 
         -0.1, 0.4, 0.0, 
         -0.1, 0.0, 0.0,
      
         -0.3, 0.4, 0.0,
         -0.1, 0.0, 0.0, 
         -0.3, 0.0, 0.0,
            
          //Orange Part
        
          -0.60+Math.sin(scalar-0.6)*0.65, -0.3+Math.cos(scalar)*0.1,   0.0,
          -0.50+Math.sin(scalar-0.5)*0.65, -0.3+Math.cos(scalar)*0.1,  0.0,
          -0.60+Math.sin(scalar-0.6)*0.65, -0.5+Math.cos(scalar)*0.1,   0.0,
        
          -0.50+Math.sin(scalar-0.5)*0.65, -0.3+Math.cos(scalar)*0.1,   0.0,
          -0.60+Math.sin(scalar-0.6)*0.65, -0.5+Math.cos(scalar)*0.1,  0.0,
          -0.50+Math.sin(scalar-0.5)*0.65, -0.55+Math.cos(scalar)*0.1,   0.0,
            
          -0.40+Math.sin(scalar-0.4)*0.65, -0.3+Math.cos(scalar)*0.1,   0.0,
          -0.30+Math.sin(scalar-0.3)*0.65, -0.3+Math.cos(scalar)*0.1,  0.0,
          -0.40+Math.sin(scalar-0.4)*0.65, -0.6+Math.cos(scalar)*0.1,   0.0,
            
          -0.40+Math.sin(scalar-0.4)*0.65, -0.6+Math.cos(scalar)*0.1,   0.0,
          -0.30+Math.sin(scalar-0.3)*0.65, -0.3+Math.cos(scalar)*0.1,  0.0,
          -0.30+Math.sin(scalar-0.3)*0.65, -0.65+Math.cos(scalar)*0.1,   0.0,
            
          -0.20+Math.sin(scalar-0.2)*0.65, -0.3+Math.cos(scalar)*0.1,   0.0,
          -0.075+Math.sin(scalar-0.075)*0.65, -0.3+Math.cos(scalar)*0.1,  0.0,
          -0.2+Math.sin(scalar-0.2)*0.65, -0.7+Math.cos(scalar)*0.1,   0.0,
            
          -0.20+Math.sin(scalar-0.2)*0.65, -0.7+Math.cos(scalar)*0.1,   0.0,
          -0.075+Math.sin(scalar-0.075)*0.65, -0.75+Math.cos(scalar)*0.1,  0.0,
          -0.075+Math.sin(scalar-0.075)*0.65, -0.3+Math.cos(scalar)*0.1,   0.0,
            
          0.20+Math.sin(scalar+0.2)*0.65, -0.7+Math.cos(scalar)*0.1,   0.0,
          0.075+Math.sin(scalar+0.075)*0.65, -0.75+Math.cos(scalar)*0.1,  0.0,
          0.075+Math.sin(scalar+0.075)*0.65, -0.3+Math.cos(scalar)*0.1,   0.0,
            
          0.20+Math.sin(scalar+0.2)*0.65, -0.3+Math.cos(scalar)*0.1,   0.0,
          0.075+Math.sin(scalar+0.075)*0.65, -0.3+Math.cos(scalar)*0.1,  0.0,
          0.2+Math.sin(scalar+0.2)*0.65, -0.7+Math.cos(scalar)*0.1,   0.0,
        
          0.40+Math.sin(scalar+0.4)*0.65, -0.3+Math.cos(scalar)*0.1,   0.0,
          0.30+Math.sin(scalar+0.3)*0.65, -0.3+Math.cos(scalar)*0.1,  0.0,
          0.40+Math.sin(scalar+0.4)*0.65, -0.6+Math.cos(scalar)*0.1,   0.0,
        
          0.40+Math.sin(scalar+0.4)*0.65, -0.6+Math.cos(scalar)*0.1,   0.0,
          0.30+Math.sin(scalar+0.3)*0.65, -0.3+Math.cos(scalar)*0.1,  0.0,
          0.30+Math.sin(scalar+0.3)*0.65, -0.65+Math.cos(scalar)*0.1,   0.0,
    
          0.60+Math.sin(scalar+0.6)*0.65, -0.3+Math.cos(scalar)*0.1,   0.0,
          0.50+Math.sin(scalar+0.5)*0.65, -0.3+Math.cos(scalar)*0.1,  0.0,
          0.60+Math.sin(scalar+0.6)*0.65, -0.5+Math.cos(scalar)*0.1,   0.0,
            
          0.50+Math.sin(scalar+0.5)*0.65, -0.3+Math.cos(scalar)*0.1,   0.0,
          0.60+Math.sin(scalar+0.6)*0.65, -0.5+Math.cos(scalar)*0.1,  0.0,
          0.50+Math.sin(scalar+0.5)*0.65, -0.55+Math.cos(scalar)*0.1,   0.0
       
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);
        vertexPositionBuffer.itemSize = 3;
        vertexPositionBuffer.numberOfItems = 90;
}

//set up canvas
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders(); 
  setupBuffers();
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

//start animiation 
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}
