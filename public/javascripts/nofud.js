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
            grid = 50,
            snap = 50;

    // Canvas Operations Listeners
    
    nfc.on('object:modified', function (options) {
        var newWidth = (Math.round(options.target.getScaledWidth() * grid) / grid);
        var newHeight = (Math.round(options.target.getScaledHeight() * grid) / grid);

        if (options.target.getWidth() !== newWidth) {
            options.target.set({ width: newWidth, height: newHeight, scaleX: 1, scaleY: 1});
        }
    });
    
    nfc.on('object:scaling', options => {
        var target = options.target,
            w = target.width * target.scaleX,
            h = target.height * target.scaleY,
            snap = { // Closest snapping points
                top: Math.round(target.top / grid) * grid,
                left: Math.round(target.left / grid) * grid,
                bottom: Math.round((target.top + h) / grid) * grid,
                right: Math.round((target.left + w) / grid) * grid
            },
            threshold = grid,
            dist = { // Distance from snapping points
                top: Math.abs(snap.top - target.top),
                left: Math.abs(snap.left - target.left),
                bottom: Math.abs(snap.bottom - target.top - h),
                right: Math.abs(snap.right - target.left - w)
            },
            attrs = {
                scaleX: target.scaleX,
                scaleY: target.scaleY,
                top: target.top,
                left: target.left
            };
        switch (target.__corner) {
            case 'tl':
                if (dist.left < dist.top && dist.left < threshold) {
                    attrs.scaleX = (w - (snap.left - target.left)) / target.width;
                    attrs.scaleY = (attrs.scaleX / target.scaleX) * target.scaleY;
                    attrs.top = target.top + (h - target.height * attrs.scaleY);
                    attrs.left = snap.left;
                } else if (dist.top < threshold) {
                    attrs.scaleY = (h - (snap.top - target.top)) / target.height;
                    attrs.scaleX = (attrs.scaleY / target.scaleY) * target.scaleX;
                    attrs.left = attrs.left + (w - target.width * attrs.scaleX);
                    attrs.top = snap.top;
                }
                break;
            case 'mt':
                if (dist.top < threshold) {
                    attrs.scaleY = (h - (snap.top - target.top)) / target.height;
                    attrs.top = snap.top;
                }
                break;
            case 'tr':
                if (dist.right < dist.top && dist.right < threshold) {
                    attrs.scaleX = (snap.right - target.left) / target.width;
                    attrs.scaleY = (attrs.scaleX / target.scaleX) * target.scaleY;
                    attrs.top = target.top + (h - target.height * attrs.scaleY);
                } else if (dist.top < threshold) {
                    attrs.scaleY = (h - (snap.top - target.top)) / target.height;
                    attrs.scaleX = (attrs.scaleY / target.scaleY) * target.scaleX;
                    attrs.top = snap.top;
                }
                break;
            case 'ml':
                if (dist.left < threshold) {
                    attrs.scaleX = (w - (snap.left - target.left)) / target.width;
                    attrs.left = snap.left;
                }
                break;
            case 'mr':
                if (dist.right < threshold) attrs.scaleX = (snap.right - target.left) / target.width;
                break;
            case 'bl':
                if (dist.left < dist.bottom && dist.left < threshold) {
                    attrs.scaleX = (w - (snap.left - target.left)) / target.width;
                    attrs.scaleY = (attrs.scaleX / target.scaleX) * target.scaleY;
                    attrs.left = snap.left;
                } else if (dist.bottom < threshold) {
                    attrs.scaleY = (snap.bottom - target.top) / target.height;
                    attrs.scaleX = (attrs.scaleY / target.scaleY) * target.scaleX;
                    attrs.left = attrs.left + (w - target.width * attrs.scaleX);
                }
                break;
            case 'mb':
                if (dist.bottom < threshold) attrs.scaleY = (snap.bottom - target.top) / target.height;
                break;
            case 'br':
                if (dist.right < dist.bottom && dist.right < threshold) {
                    attrs.scaleX = (snap.right - target.left) / target.width;
                    attrs.scaleY = (attrs.scaleX / target.scaleX) * target.scaleY;
                } else if (dist.bottom < threshold) {
                    attrs.scaleY = (snap.bottom - target.top) / target.height;
                    attrs.scaleX = (attrs.scaleY / target.scaleY) * target.scaleX;
                }
                break;
        }
        target.set(attrs);
        nfc.fire('object:modified', {target: target});
    });

    nfc.on('object:moving', function (options) {
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
            options.target.setLeft(canvasWidth - options.target.getWidth());
        }

        if((options.target.getHeight() + options.target.getTop()) > (canvasHeight - snap)) {
            options.target.setTop(canvasHeight - options.target.getHeight());
        }

        // Loop through objects
        nfc.forEachObject(function (obj) {
            if (obj === options.target) return;

            // If objects intersect
            if (options.target.isContainedWithinObject(obj) || options.target.intersectsWithObject(obj) || obj.isContainedWithinObject(options.target)) {

                var distX = ((obj.getLeft() + obj.getWidth()) / 2) - ((options.target.getLeft() + options.target.getWidth()) / 2);
                var distY = ((obj.getTop() + obj.getHeight()) / 2) - ((options.target.getTop() + options.target.getHeight()) / 2);

                // Set new position
                findNewPos(distX, distY, options.target, obj);
            }

            // Snap objects to each other horizontally

            // If bottom points are on same Y axis
            if(Math.abs((options.target.getTop() + options.target.getHeight()) - (obj.getTop() + obj.getHeight())) < snap) {
                // Snap target BL to object BR
                if(Math.abs(options.target.getLeft() - (obj.getLeft() + obj.getWidth())) < snap) {
                    options.target.setLeft(obj.getLeft() + obj.getWidth());
                    options.target.setTop(obj.getTop() + obj.getHeight() - options.target.getHeight());
                }

                // Snap target BR to object BL
                if(Math.abs((options.target.getLeft() + options.target.getWidth()) - obj.getLeft()) < snap) {
                    options.target.setLeft(obj.getLeft() - options.target.getWidth());
                    options.target.setTop(obj.getTop() + obj.getHeight() - options.target.getHeight());
                }
            }

            // If top points are on same Y axis
            if(Math.abs(options.target.getTop() - obj.getTop()) < snap) {
                // Snap target TL to object TR
                if(Math.abs(options.target.getLeft() - (obj.getLeft() + obj.getWidth())) < snap) {
                    options.target.setLeft(obj.getLeft() + obj.getWidth());
                    options.target.setTop(obj.getTop());
                }

                // Snap target TR to object TL
                if(Math.abs((options.target.getLeft() + options.target.getWidth()) - obj.getLeft()) < snap) {
                    options.target.setLeft(obj.getLeft() - options.target.getWidth());
                    options.target.setTop(obj.getTop());
                }
            }

            // Snap objects to each other vertically

            // If right points are on same X axis
            if(Math.abs((options.target.getLeft() + options.target.getWidth()) - (obj.getLeft() + obj.getWidth())) < snap) {
                // Snap target TR to object BR
                if(Math.abs(options.target.getTop() - (obj.getTop() + obj.getHeight())) < snap) {
                    options.target.setLeft(obj.getLeft() + obj.getWidth() - options.target.getWidth());
                    options.target.setTop(obj.getTop() + obj.getHeight());
                }

                // Snap target BR to object TR
                if(Math.abs((options.target.getTop() + options.target.getHeight()) - obj.getTop()) < snap) {
                    options.target.setLeft(obj.getLeft() + obj.getWidth() - options.target.getWidth());
                    options.target.setTop(obj.getTop() - options.target.getHeight());
                }
            }

            // If left points are on same X axis
            if(Math.abs(options.target.getLeft() - obj.getLeft()) < snap) {
                // Snap target TL to object BL
                if(Math.abs(options.target.getTop() - (obj.getTop() + obj.getHeight())) < snap) {
                    options.target.setLeft(obj.getLeft());
                    options.target.setTop(obj.getTop() + obj.getHeight());
                }

                // Snap target BL to object TL
                if(Math.abs((options.target.getTop() + options.target.getHeight()) - obj.getTop()) < snap) {
                    options.target.setLeft(obj.getLeft());
                    options.target.setTop(obj.getTop() - options.target.getHeight());
                }
            }
        });

        options.target.setCoords();

        // If objects still overlap

        var outerAreaLeft = null,
        outerAreaTop = null,
        outerAreaRight = null,
        outerAreaBottom = null;

        nfc.forEachObject(function (obj) {
            if (obj === options.target) return;

            if (options.target.isContainedWithinObject(obj) || options.target.intersectsWithObject(obj) || obj.isContainedWithinObject(options.target)) {

                var intersectLeft = null,
                intersectTop = null,
                intersectWidth = null,
                intersectHeight = null,
                intersectSize = null,
                targetLeft = options.target.getLeft(),
                targetRight = targetLeft + options.target.getWidth(),
                targetTop = options.target.getTop(),
                targetBottom = targetTop + options.target.getHeight(),
                objectLeft = obj.getLeft(),
                objectRight = objectLeft + obj.getWidth(),
                objectTop = obj.getTop(),
                objectBottom = objectTop + obj.getHeight();

                // Find intersect information for X axis
                if(targetLeft >= objectLeft && targetLeft <= objectRight) {
                    intersectLeft = targetLeft;
                    intersectWidth = obj.getWidth() - (intersectLeft - objectLeft);

                } else if(objectLeft >= targetLeft && objectLeft <= targetRight) {
                    intersectLeft = objectLeft;
                    intersectWidth = options.target.getWidth() - (intersectLeft - targetLeft);
                }

                // Find intersect information for Y axis
                if(targetTop >= objectTop && targetTop <= objectBottom) {
                    intersectTop = targetTop;
                    intersectHeight = obj.getHeight() - (intersectTop - objectTop);

                } else if(objectTop >= targetTop && objectTop <= targetBottom) {
                    intersectTop = objectTop;
                    intersectHeight = options.target.getHeight() - (intersectTop - targetTop);
                }

                // Find intersect size (this will be 0 if objects are touching but not overlapping)
                if(intersectWidth > 0 && intersectHeight > 0) {
                    intersectSize = intersectWidth * intersectHeight;
                }

                // Set outer snapping area
                if(obj.getLeft() < outerAreaLeft || outerAreaLeft == null) {
                    outerAreaLeft = obj.getLeft();
                }

                if(obj.getTop() < outerAreaTop || outerAreaTop == null) {
                    outerAreaTop = obj.getTop();
                }

                if((obj.getLeft() + obj.getWidth()) > outerAreaRight || outerAreaRight == null) {
                    outerAreaRight = obj.getLeft() + obj.getWidth();
                }

                if((obj.getTop() + obj.getHeight()) > outerAreaBottom || outerAreaBottom == null) {
                    outerAreaBottom = obj.getTop() + obj.getHeight();
                }

                // If objects are intersecting, reposition outside all shapes which touch
                if(intersectSize) {
                    var distX = (outerAreaRight / 2) - ((options.target.getLeft() + options.target.getWidth()) / 2);
                    var distY = (outerAreaBottom / 2) - ((options.target.getTop() + options.target.getHeight()) / 2);

                    // Set new position
                    findNewPos(distX, distY, options.target, obj);
                }
            }
        });
    });

    // UI Functions

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
    
    function createGrid(){
        // for (var i = 0; i < (800 / grid); i++) {
        //     nfc.add(new fabric.Line([i * grid, 0, i * grid, 600], {
        //         stroke: '#ddd',
        //         selectable: false,
        //         excludeFromExport: true
        //     }));
        //     nfc.add(new fabric.Line([0, i * grid, 800, i * grid], {
        //         stroke: '#ddd',
        //         selectable: false,
        //         excludeFromExport: true
        //     }))
        // }
        return false;
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
            maxWidth: canvasWidth,
            maxHeight: canvasHeight,
            fill: type == 'wall' ? 'purple' : 'yellow',
            angle: 0,
            strokeWidth: 0,
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
            angle: 0,
            strokeWidth: 0,
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