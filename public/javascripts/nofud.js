;(function(w,d){
    const nfc = new fabric.Canvas('nofud-canvas'),
            canvasWidth = document.getElementById('nofud-canvas').width,
            canvasHeight = document.getElementById('nofud-canvas').height,
            addNewFButton = d.querySelector("#addNewFButton"),
            addNewWButton = d.querySelector("#addNewWButton"),
            addNewPButton = d.querySelector("#addNewPButton"),
            resetButton = d.querySelector("#resetButton"),
            calculateButton = d.querySelector("#calculateButton"),
            numPeople = d.querySelector("#numPeople"),
            grid = 50;

    // Canvas Operations Listeners
    function findNewPos(distX, distY, target, obj) {
        // See whether to focus on X or Y axis
        if(Math.abs(distX) > Math.abs(distY)) {
            if (distX > 0) {
                target.setLeft(obj.getLeft() - target.getWidth());
            } else {
                target.setLeft(obj.getLeft() + obj.getWidth());
            }
        } else {
            if (distY > 0) {
                target.setTop(obj.getTop() - target.getHeight());
            } else {
                target.setTop(obj.getTop() + obj.getHeight());
            }
        }
    }

    nfc.on('object:moving', function(options) {
        options.target.set({
            left: Math.round(options.target.left / grid) * grid,
            top: Math.round(options.target.top / grid) * grid
        });
    });

    // UI Functions
    
    function createGrid(){
        for (var i = 0; i < (800 / grid); i++) {
            nfc.add(new fabric.Line([i * grid, 0, i * grid, 600], {
                stroke: '#ddd',
                selectable: false,
                excludeFromExport: true
            }));
            nfc.add(new fabric.Line([0, i * grid, 800, i * grid], {
                stroke: '#ddd',
                selectable: false,
                excludeFromExport: true
            }))
        }
    }

    function addToNOFUD(obj){
        nfc.add(obj);
        nfc.setActiveObject(obj);
    }

    function createObstacle(type="furniture",w=100,h=100){
        let obst = new fabric.Rect({
            id: `${type}`,
            width: w, height: h,
            left: 100, top: 100,
            originX: "left",
            originY: "top",
            lockRotation: true,
            hasRotatingPoint: false,
            perPixelTargetFind: true,
            minScaleLimit: 1,
            maxWidth: nfc.width,
            maxHeight: nfc.height,
            fill: type == 'wall' ? 'purple' : 'yellow',
            angle: 0
        });
        return obst;
    }

        function createPerson(type="person",w=50,h=50){
        let obst = new fabric.Rect({
            id: `${type}`,
            width: w, height: h,
            left: 50, top: 50,
            originX: "left",
            originY: "top",
            lockRotation: true,
            fill: 'aqua',
            angle: 0
        });
        return obst;
    }

    function initNOFUD(){
        
        addNewFButton.addEventListener('click', () =>{
            addToNOFUD(createObstacle("furniture"));
        },false);
        addNewWButton.addEventListener('click', () =>{
            addToNOFUD(createObstacle("wall"));
        },false);
        addNewPButton.addEventListener('click', () =>{
            addToNOFUD(createPerson());
        },false);
        resetButton.addEventListener('click', () =>{
            nfc.clear();
            createGrid();
            addToNOFUD(createObstacle());
        }, false);
        calculateButton.addEventListener('click', () => {
            console.log("calculating...");

            fetch('/calc/',{
                method:'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    numPeople:parseInt(numPeople.value),
                    canvas:nfc.toJSON(['id'])
                })
            }).then(response => response.json())
            .then(data => console.log(data));

        },false);

        createGrid();
        let firstObst = createObstacle();
        addToNOFUD(firstObst);
    }

    initNOFUD();

})(window,document)