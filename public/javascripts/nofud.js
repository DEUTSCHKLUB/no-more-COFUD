;(function(w,d){
    // Poll for jobs

    function pollJob(jid, output){
        const jobProgWrap = output;
        const source = new EventSource(`/status/${jid}`);

        source.addEventListener('message', message => {
            if(message.data == "Complete"){
                console.log(`Received last message`);
                source.close();
                jobProgWrap.innerHTML = message.data;
                fetch(`/results/${jid}`,{
                    method:'GET'
                }).then(response => {
                    return response.json();
                }).then(data => {
                    let {status, items} = JSON.parse(data);
                    console.log(`Received data: ${data}`);

                    if(status == 1) {
                        jobProgWrap.innerHTML = 'Success!'
                        displayResults(items);
                    } else {
                        jobProgWrap.innerHTML = 'No solution found! Try reducing furniture or people.'
                    }

                }).catch(err => {
                    console.log(err);
                });
            } else {
                jobProgWrap.innerHTML = message.data;
            }
        });
    }

    // fabric stuff
    const nfc = new fabric.Canvas('nofud-canvas', {selection: false}),
            canvasWidth = 800,
            canvasHeight = 600,
            addNewFButton = d.querySelector("#addNewFButton"),
            addNewWButton = d.querySelector("#addNewWButton"),
            addNewPButton = d.querySelector("#addNewPButton"),
            eraseButton = d.querySelector("#eraseButton"),
            resetButton = d.querySelector("#resetButton"),
            calculateButton = d.querySelector("#calculateButton"),
            numPeople = d.querySelector("#numPeople"),
            grid = 50,
            snap = 50,
            unitScale = 50;

    // create grid

    function createGrid(){
        for (var i = 0; i < (canvasWidth / grid); i++) {
            nfc.add(new fabric.Line([ i * grid, 0, i * grid, canvasHeight], { type:'line', stroke: '#ccc', selectable: false, excludeFromExport: true }));
            nfc.add(new fabric.Line([ 0, i * grid, canvasWidth, i * grid], { type: 'line', stroke: '#ccc', selectable: false, excludeFromExport: true }))
        }
    }
    
    // snap to grid

    nfc.on('object:moving', function(options) { 
        options.target.set({
            left: Math.round(options.target.left / grid) * grid,
            top: Math.round(options.target.top / grid) * grid
        });
        // Don't allow objects off the canvas
        if(options.target.getLeft() < snap) {
            options.target.setLeft(0);
        }

        if(options.target.getTop() < snap) {
            options.target.setTop(0);
        }

        if((options.target.getWidth() + options.target.getLeft()) > (canvasWidth - snap)) {
            // console.log(`snapping because width ${options.target.getWidth()} left ${options.target.getLeft()} cw ${canvasWidth} snap ${snap}`)
            options.target.setLeft(canvasWidth - options.target.getWidth());
        }

        if((options.target.getHeight() + options.target.getTop()) > (canvasHeight - snap)) {
            // console.log(`snapping because width ${options.target.getHeight()} left ${options.target.getTop()} cw ${canvasHeight} snap ${snap}`)
            options.target.setTop(canvasHeight - options.target.getHeight());
        }
        checkIntersection(options);
    });

    nfc.on('object:modified', function(options) { 	  	
        var newWidth = (Math.round(options.target.getWidth() / grid)) * grid;
        var newHeight = (Math.round(options.target.getHeight() / grid)) * grid;
        
        options.target.set({ 
            width: newWidth, 
            height: newHeight, 
            scaleX: 1, 
            scaleY: 1
        });

        checkIntersection(options);
    });

    // UI Functions

    function checkIntersection(options) {
        options.target.setCoords();
        nfc.forEachObject(function(obj) {
            if (obj === options.target) return;
            if(obj.selectable){
                obj.set('stroke', options.target.intersectsWithObject(obj, true) ? '#FF0000' : '');
            }
        });
    }

    function addToNOFUD(obj){
        nfc.add(obj);
        nfc.setActiveObject(obj);
    }

    function removeSelectedObject(){
        console.log(`Active: ${nfc.getActiveObject()}`);
        nfc.remove(nfc.getActiveObject());
    }

    function displayResults(listItems) {
        nfc.clear();
        createGrid();

        if(listItems !== undefined) {
            var len = listItems.length;		
            for(var i = 0; i< len; i+=1 ){
                var item = listItems[i];
                nfc.add(new fabric.Rect({ 
                    left: item.left * unitScale, 
                    top: item.top * unitScale, 
                    width: item.width * unitScale, 
                    height: item.height * unitScale, 
                    type: 'rectangle',
                    fill: item.id == "Person" ? "aqua" : item.id == "Wall" ? "purple" : "yellow", 
                    stroke:'',
                    hasRotatingPoint: false,
                    originX: 'left', 
                    originY: 'top',
                    id: item.id !== undefined ? item.id : '', 
                    hasControls: true,		
                    centeredRotation: true,
                    strokeUniform: true,
                    transparentCorners: false,
                    minScaleLimit: 1,
                    maxWidth: canvasWidth,
                    maxHeight: canvasHeight,
                }));		
            }
            nfc.renderAll();
        }else{
            console.log('Error importing results data.');
        }
    }

    function createObstacle(type="Furniture",w=100,h=100){
        let obst = new fabric.Rect({
            id: `${type}`,
            width: w, height: h,
            left: 100, top: 100,
            originX: "left",
            originY: "top",
            lockRotation: true,
            hasControls: true,
            hasRotatingPoint: false,
            perPixelTargetFind: false,
            minScaleLimit: 1,
            maxWidth: canvasWidth,
            maxHeight: canvasHeight,
            fill: type == 'Wall' ? 'purple' : 'yellow',
            angle: 0,
            stroke: '',
            strokeUniform: true,
            transparentCorners: false
        });
        return obst;
    }

    function createPerson(type="Person",w=50,h=50){
        let obst = new fabric.Rect({
            id: `${type}`,
            width: w, height: h,
            left: 50, top: 50,
            originX: "left",
            originY: "top",
            lockRotation: true,
            lockScalingX: true,
            lockScalingY: true,
            fill: 'aqua',
            angle: 0,
            strokeWidth: 0,
            stroke: '',
            hasRotatingPoint: false,
            hasControls: true,
            transparentCorners: false
        });
        return obst;
    }

    function initNOFUD(){
        
        addNewFButton.addEventListener('click', () =>{
            addToNOFUD(createObstacle("Furniture"));
        },false);
        addNewWButton.addEventListener('click', () =>{
            addToNOFUD(createObstacle("Wall"));
        },false);
        addNewPButton.addEventListener('click', () =>{
            addToNOFUD(createPerson());
        },false);
        eraseButton.addEventListener('click', () =>{
            removeSelectedObject();
        },false);
        resetButton.addEventListener('click', () =>{
            nfc.clear();
            createGrid();
            addToNOFUD(createObstacle());
        }, false);
        calculateButton.addEventListener('click', () => {
            let jobID = Date.now();
            
            console.log(`calculating job ${jobID}...`);            

            fetch(`/calc/${jobID}`,{
                method:'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    numPeople:parseInt(numPeople.value),
                    canvas:nfc.toJSON(['id'])
                })
            }).then(response => {
                return response.json();
            }).then(data => {
                let {status, items} = JSON.parse(data);
                // rebuild canvas here with data
                // displayResults(items);
                // once it's wired we'll need to poll results
                pollJob(jobID, d.querySelector('#status'));
            }).catch(err => {
                console.log(err);
            });

        },false);

        createGrid();
        let firstObst = createObstacle();
        addToNOFUD(firstObst);
    }

    initNOFUD();

})(window,document)