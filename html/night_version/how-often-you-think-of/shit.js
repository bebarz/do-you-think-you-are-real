const CURSOR_PUSH_STRENGTH = 3000;
const EPSILON = 1;
const FRICTION_DECAY = 0.995;
const R_VICTORY_CIRCLE = 270;
const REPULSE_PUSH_STRENGTH = 250;
const TARGET_SIZE = 100;
const TICK_INTERVAL = 50;
const V_INIT = 5;


const MARGIN = TARGET_SIZE / 2;

var clientSize;
var clientCenter;
var drawArea;
var mouseCoords;
var nTargets;
var nextTick;
var targets;
var edgeLength;

/* 
    Some basic vector functions 
*/

const nullVec = { x: 0, y: 0 };

function vecsAdd(v1, v2) {
    return {
        x: v1.x + v2.x,
        y: v1.y + v2.y
    }
}

function vecMult(v, a) {
    return {
        x: v.x * a,
        y: v.y * a
    }
}

function vecsEqual(v1, v2) {
    return vecDist(v1, v2) < EPSILON;
}

function vecDist(v1, v2) {
    var delta = vecsAdd(v1, vecMult(v2, -1));
    return vecLen(delta);
}

function vecLen(v) {
    return Math.sqrt(Math.pow(v.x, 2) + Math.pow(v.y, 2));
}

// Randomly oriented unit vector
function vecRand() {
    const theta = Math.random() * 2 * Math.PI;
    return {
        x: Math.cos(theta),
        y: Math.sin(theta)
    }
}

function vecToString(v) {
    return "x: " + v.x + "\ny:" + v.y;
}

/*
    Game logic
*/


function init() {
    drawArea = document.getElementById("DrawArea");
    clientSize = {
        x: drawArea.clientWidth,
        y: drawArea.clientHeight
    };
    clientCenter = vecMult(clientSize, 1 / 2);
    nTargets = 2;
    // Draw victory circle
    const square = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    edgeLength = Math.min(clientSize.x, clientSize.y) / 2;
    square.setAttribute("width", edgeLength);
    square.setAttribute("height", edgeLength);
    square.setAttribute("x", (clientSize.x - edgeLength) / 2);
    square.setAttribute("y", (clientSize.y - edgeLength) / 2);
    square.setAttribute("id", "square");
    square.setAttribute("class", "target-circle");
    drawArea.appendChild(square);

    const frame = document.getElementById("frame");
    frame.setAttribute("width", edgeLength);
    frame.setAttribute("height", edgeLength);
    frame.setAttribute("left", (clientSize.x - edgeLength) / 2);
    frame.setAttribute("top", (clientSize.y - edgeLength) / 2);

    // Center intro text
    const introText = document.getElementById("IntroText");
    introText.setAttribute("x", (clientSize.x - introText.clientWidth) / 2);
    introText.setAttribute("y", (clientSize.y - introText.clientHeight) / 2);

    generateTargets();

    // Start main loop
    nextTick = Number(new Date());
    handleTick();
}

function generateTargets() {
    targets = new Array(nTargets);
    for (var i = 0; i < nTargets; i++) {
        const pos = generateStartPosition();
        const target = document.createElementNS("http://www.w3.org/2000/svg", "image");
        target.setAttribute("href", "images/poop.svg");
        target.setAttribute("width", TARGET_SIZE);
        target.setAttribute("height", TARGET_SIZE);
        drawArea.appendChild(target);
        targets[i] = {
            "ref": target,
            "pos": pos,
            "vel": vecMult(vecRand(), V_INIT)
        }
        drawTarget(targets[i]);
    }
}

function clearTargets() {
    for (var i = 0; i < nTargets; i++) {
        drawArea.removeChild(targets[i].ref);
    }
}

function generateStartPosition() {
    // Loop until we get a position outside the victory circle
    while (true) {
        const pos = {
            x: TARGET_SIZE / 2 + Math.random() * (drawArea.clientWidth - TARGET_SIZE),
            y: TARGET_SIZE / 2 + Math.random() * (drawArea.clientHeight - TARGET_SIZE)
        };
        if (vecDist(pos, clientCenter) > R_VICTORY_CIRCLE) {
            return pos;
        }
    }
}

// Main game loop
function handleTick() {
    if (checkVictory()) {
        clearTargets();
        nTargets++;
        generateTargets();
    }
    else {
        // Differences between vector pairs
        const distances = getDistanceMatrix();

        // Compute moves for each element
        for (var targetIndex = 0; targetIndex < nTargets; targetIndex++) {
            const target = targets[targetIndex];
            var deltaV = getCursorRepel(target.pos);
            deltaV = vecsAdd(deltaV, getMutualRepel(distances[targetIndex]));
            target.vel = vecsAdd(vecMult(target.vel, FRICTION_DECAY), deltaV);
            updateTargetPosition(target);
        }
    }
    setNextTick();
}

function drawTarget(target) {
    target.ref.setAttribute("x", target.pos.x - MARGIN / 2);
    target.ref.setAttribute("y", target.pos.y - MARGIN / 2);
}

function updateTargetPosition(target) {
    target.pos = vecsAdd(target.pos, target.vel);
    boundCoord(target, "x");
    boundCoord(target, "y");
    drawTarget(target);
}

function boundCoord(target, coord) {
    if (target.pos[coord] < MARGIN) {
        target.pos[coord] = MARGIN;
        target.vel[coord] = -target.vel[coord];
    }
    if (target.pos[coord] > clientSize[coord] - MARGIN) {
        target.pos[coord] = clientSize[coord] - MARGIN;
        target.vel[coord] = -target.vel[coord];
    }
}

// Acceleration due to running away from cursor
function getCursorRepel(pCenter) {
    if (mouseCoords === undefined) {
        return nullVec;
    }
    const diff = vecsAdd(pCenter, vecMult(mouseCoords, -1));
    return getRepelFromDiff(diff, CURSOR_PUSH_STRENGTH);
}

// Acceleration due to mutual repulsion
function getMutualRepel(distances) {
    var deltaV = nullVec;
    for (var targetIndex = 0; targetIndex < distances.length; targetIndex++) {
        const diff = distances[targetIndex];
        deltaV = vecsAdd(deltaV, getRepelFromDiff(diff, REPULSE_PUSH_STRENGTH));
    }
    return deltaV;
}

function getRepelFromDiff(diff, stengthConst) {
    const dst = vecLen(diff);
    if (dst === 0) {
        // Add some random jitter
        return vecRand();
    }
    else {
        const vu = vecMult(diff, 1 / dst);
        return vecMult(vu, stengthConst / Math.pow(dst, 2));
    }
}

// Get an array of distances to all other targets from a given target
function getDistanceMatrix() {
    return targets.map(t1 =>
        targets.map(t2 => vecBetweenTargets(t1, t2)).filter(v => v !== undefined)
    );
}

// Distance between target points, or undefined if the two targets are the same item
function vecBetweenTargets(t1, t2) {
    if (Object.is(t1, t2)) {
        return undefined;
    }
    return vecsAdd(t1.pos, vecMult(t2.pos, -1));
}

function setNextTick() {
    nextTick += TICK_INTERVAL;
    setTimeout(handleTick, Math.max(0, nextTick - Number(new Date())));
}

function checkVictory() {
    const outside = targets.filter(t => isOutside(t.pos));
    if (outside.length > 0) {
        return false;
    }
    return true;
}

function isOutside(targetPosition) {
    var square = document.getElementById("square")
    if (targetPosition.x <= parseFloat(square.getAttribute("x"))) {
        return true;
    }

    if (targetPosition.y <= parseFloat(square.getAttribute("y"))) {
        return true;
    }

    if (targetPosition.x >= (parseFloat(square.getAttribute("x")) + edgeLength)) {
        return true;
    }

    if (targetPosition.y >= (parseFloat(square.getAttribute("y")) + edgeLength)) {
        return true;
    }
    
    return false;
}



function handleMouseMove(evt) {
    mouseCoords = {
        x: evt.clientX,
        y: evt.clientY
    }
}



const textArray = [];

// Function to fetch text from a file
async function fetchTextFromFile() {
    try {
        const response = await fetch('shit.txt'); 
        const text = await response.text();
        // Split the text into an array using line breaks as separators
        textArray.push(...text.split('\n').map(line => line.trim()));
    } catch (error) {
        console.error('Error fetching text:', error);
    }
}
fetchTextFromFile().then(() => {
    const textContainer = document.getElementById("text-container");
    let currentIndex = 0;
    let intervalDuration = 1600; 
    const intervalFactor = 0.98; 

    function changeLanguage() {
        textContainer.textContent = textArray[currentIndex];
        currentIndex = (currentIndex + 1) % textArray.length;
        intervalDuration *= intervalFactor; 

     
        setTimeout(changeLanguage, intervalDuration);
    }

    setTimeout(changeLanguage, intervalDuration);
});

