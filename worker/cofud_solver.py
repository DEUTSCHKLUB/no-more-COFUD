from __future__ import print_function
from enum import Enum
import collections
from math import sqrt
from ortools.sat.python import cp_model
import matplotlib.pyplot as plt
from itertools import combinations
import json
from json import JSONEncoder
import sys
 
if len(sys.argv) != 4:
    raise ValueError('Provide people count, input JSON file, output JSON file')
 
print(f'Script Name is {sys.argv}')


extra_people = int(sys.argv[1])

jsonPath = sys.argv[2]
outputPath = sys.argv[3]

model = cp_model.CpModel()

class HolderType(Enum):
    Person = 1
    Furniture = 2
    Wall = 3
    Empty = 4

class Rectangle:
    def __init__(self, width, height, x, y, holderType):
        self.width = width
        self.height = height
        self.x = x
        self.y = y
        self.holderType = holderType

class RoomObject:
    def __init__(self, rectangle, x1, y1, x2, y2, x_interval, y_interval):
        self.rectangle = rectangle
        self.x1 = x1
        self.x2 = x2
        self.y1 = y1
        self.y2 = y2
        self.x_interval = x_interval
        self.y_interval = y_interval

    def toJson(self, left, top):
        return {"left": left,
        "top": top,
        "width": self.rectangle.width,
        "height": self.rectangle.height,
        "id": self.rectangle.holderType.name}

distance = 7
distanceSquared = distance ** 2
roomWidth = 16
roomHeight = 12


room_data = []


def ParseJson(filePath):
    with open(filePath) as f:
        data = json.load(f)

    for item in data:
        newWidth = int(round(int(item['width']) // 50))
        newHeight = int(round(int(item['height']) // 50))
        newX = int(round(int(item['left']) // 50))
        newY = int(round(int(item['top']) // 50))
        fill = item['fill']
        itemId = item['id']
        holderType = HolderType.Empty

        if itemId == 'furniture':
            holderType = HolderType.Furniture
        elif itemId == 'person':
            holderType = HolderType.Person
        elif itemId == 'wall':
            holderType = HolderType.Wall

        # if it's yellow it means it's movable furniture, so blank out the x and y
        if fill == 'yellow':
            newX = -1
            newY = -1

        print(f"Trying to add rectangle with w:{newWidth} h:{newHeight} x:{newX} y:{newY} type{holderType}")

        newRectangle = Rectangle(newWidth, newHeight, newX, newY, holderType)
        room_data.append(newRectangle)

    # now add the movable people
    for num in range(extra_people):
        newRectangle = Rectangle(1, 1, -1, -1, HolderType.Person)
        room_data.append(newRectangle)



def WriteJson():
    print('not done yet')


def CofudLayout():
    room = Rectangle(roomWidth, roomHeight, 0, 0, HolderType.Empty)
    print(f"Room Size: {room.width}x{room.height}")

    all_vars = {}

    # x_intervals holds the widths of each rect
    x_intervals = []
    # y_intervals holds the lengths of each rect
    y_intervals = []

    
    # Generate movable furniture
    for rect_id, rect in enumerate(room_data):
        area = rect.width * rect.height
        print(f"Rect: {rect.width}x{rect.height}, Area: {area}")

        suffix = '_%i_%i' % (rect.width, rect.height)

        # This means it can be moved
        if rect.x == -1 or rect.y == -1:
            # interval to represent width
            x1_var = model.NewIntVar(0, room.width, 'x1' + suffix)
            x2_var = model.NewIntVar(0, room.width, 'x2' + suffix)
            x_interval_var = model.NewIntervalVar(x1_var, rect.width, x2_var, 'x_interval' + suffix)

            # interval to represent height
            y1_var = model.NewIntVar(0, room.height, 'y1' + suffix)
            y2_var = model.NewIntVar(0, room.height, 'y2' + suffix)
            y_interval_var = model.NewIntervalVar(y1_var, rect.height, y2_var, 'y_interval' + suffix)

            all_vars[rect_id] = RoomObject(
                rect,
                x1_var, 
                y1_var, 
                x2_var, 
                y2_var, 
                x_interval_var,
                y_interval_var
            )

            x_intervals.append(x_interval_var)
            y_intervals.append(y_interval_var)
        elif rect.x != -1 and rect.y != -1:
            # This means it's fixed furniture
            x1_var = model.NewIntVar(rect.x, rect.x, 'x1' + suffix)
            x2_var = model.NewIntVar(rect.x + rect.width, rect.x + rect.width, 'x2' + suffix)
            x_interval_var = model.NewIntervalVar(x1_var, rect.width, x2_var, 'fixed_x_interval' + suffix)

            y1_var = model.NewIntVar(rect.y, rect.y, 'y1' + suffix)
            y2_var = model.NewIntVar(rect.y + rect.height, rect.y + rect.height, 'y2' + suffix)
            y_interval_var = model.NewIntervalVar(y1_var, rect.height, y2_var, 'fixed_y_interval' + suffix)

            x_intervals.append(x_interval_var)
            y_intervals.append(y_interval_var)

            all_vars[rect_id] = RoomObject(
                rect,
                x1_var, 
                y1_var, 
                x2_var, 
                y2_var, 
                x_interval_var,
                y_interval_var
            )
        else:
            raise Exception("rectangle X and Y must both be -1 or both be > 1")

    # Now lets make all possible combinations and make a distance between them
    combos = list(combinations(range(len(room_data)), 2))

    print(combos) 

    currentDistanceId = 0

    distanceVariables = []

    # This could be improved by making a separate collection just for people
    # but since it will skip making the variables it shouldn't be a big performance issue
    for listSet in combos:
        leftItem = all_vars[listSet[0]]
        rightItem = all_vars[listSet[1]]

        if leftItem.rectangle.holderType == HolderType.Person and rightItem.rectangle.holderType == HolderType.Person:
            # print(f"Adding distances between {listSet[0]} and {listSet[1]} because both are people")
            
            currentDistanceId = currentDistanceId + 1

            # Add an intermediate variable to store the sum of x for the center of left object
            leftCenterXSum = model.NewIntVar(0, room.width*2, f"leftCenterXSum{currentDistanceId}")
            # Add constraint to it
            model.Add(leftCenterXSum == leftItem.x2 + leftItem.x1)
            # Add an intermediate variable to store the center of x of the left object
            leftCenterX = model.NewIntVar(0, room.width, f"leftCenterX{currentDistanceId}")
            # Add a constraint to divide it by 2 to make it te center
            model.AddDivisionEquality(leftCenterX, leftCenterXSum, 2)

            ## Repeat for x and y for left and right objects
            leftCenterYSum = model.NewIntVar(0, room.height*2, f"leftCenterYSum{currentDistanceId}")
            model.Add(leftCenterYSum == leftItem.y2 + leftItem.y1)
            leftCenterY = model.NewIntVar(0, room.height, f"leftCenterY{currentDistanceId}")
            model.AddDivisionEquality(leftCenterY, leftCenterYSum, 2)

            rightCenterXSum = model.NewIntVar(0, room.width*2, f"rightCenterXSum{currentDistanceId}")
            model.Add(rightCenterXSum == rightItem.x2 + rightItem.x1)
            rightCenterX = model.NewIntVar(0, room.width, f"rightCenterX{currentDistanceId}")
            model.AddDivisionEquality(rightCenterX, rightCenterXSum, 2)

            rightCenterYSum = model.NewIntVar(0, room.height*2, f"rightCenterYSum{currentDistanceId}")
            model.Add(rightCenterYSum == rightItem.y2 + rightItem.y1)
            rightCenterY = model.NewIntVar(0, room.height, f"rightCenterY{currentDistanceId}")
            model.AddDivisionEquality(rightCenterY, rightCenterYSum, 2)

            # Create variable for difference of x
            xDiff = model.NewIntVar(-room.width, room.width, f"xDiff{currentDistanceId}")

            # Create constraint for difference of x
            model.Add(xDiff == rightCenterX - leftCenterX)

            # Create variable for difference of y
            yDiff = model.NewIntVar(-room.height, room.height, f"yDiff{currentDistanceId}")

            # Create constraint for difference for y
            model.Add(yDiff == rightCenterY - leftCenterY)

            # Create variables for x and y squared
            xDiffSquared = model.NewIntVar(0, room.width**2, f"xDiffSquared{currentDistanceId}")
            yDiffSquared = model.NewIntVar(0, room.height**2, f"yDiffSquared{currentDistanceId}")

            # Add constraint to multiply them
            model.AddMultiplicationEquality(xDiffSquared, [xDiff, xDiff])
            model.AddMultiplicationEquality(yDiffSquared, [yDiff, yDiff])

            totalDistance = model.NewIntVar(0, room.width**2 + room.height**2, f"totalDistance{currentDistanceId}")

            model.Add(totalDistance == xDiffSquared + yDiffSquared)

            distanceVariables.append(totalDistance)

            model.Add( totalDistance >= distanceSquared )
        #else:
            # print(f"Skipping distances between {listSet[0]} and {listSet[1]} because one is furniture")
            
    model.AddNoOverlap2D(x_intervals, y_intervals)

    # objective: Area of parent (horizon) is max that the sum of all the rectangles' areas can have
    obj_var = model.NewIntVar(0, room.width * room.height, 'area')

    # minimize the area not used
    # model.Minimize(obj_var - total_area)

    # Solve model
    solver = cp_model.CpSolver()

    # hard core to using 4 cores for 5 minutes
    solver.parameters.num_search_workers = 4
    solver.parameters.max_time_in_seconds = 300.0

    #model.Maximize(sum(distanceVariables))
    status = solver.Solve(model)

    currentcolor = 1

    print(f"FEASIBLE: {cp_model.FEASIBLE}")
    print(f"INFEASIBLE: {cp_model.INFEASIBLE}")
    print(f"OPTIMAL: {cp_model.OPTIMAL}")
    print(f"Status: {status}")

    result_dict = {"status": 0,
    "items": []
    }

    if status == cp_model.OPTIMAL:
        Array = [ ["0"] * roomWidth for i in range(roomHeight) ]

        result_dict["status"] = 1
        result_dict["items"] = []        

        # update array with solution coords
        for rect_id, rect in enumerate(room_data):
            #print(solver.Value(all_vars[rect_id].x1))

            resultObject = all_vars[rect_id]

            x1=solver.Value(resultObject.x1)
            y1=solver.Value(resultObject.y1)
            x2=solver.Value(resultObject.x2)
            y2=solver.Value(resultObject.y2)

            jsonData = resultObject.toJson(x1, y1)

            print(f"appending {jsonData}")
            result_dict["items"].append(jsonData)

            print(f"{rect_id}: {x1}, {y1} -> {x2}, {y2}")

            for x in range(x1, x2):
                for y in range(y1, y2):
                    # This seems backwards, but hey, it works
                    Array[y][x] = currentcolor

            currentcolor = currentcolor + 1


        for x in Array:
            for y in x:
                print(y, end="")
            print("\n", end="")

        # Uncomment this to view as an image in a desktop environment
        #plt.imshow(Array)
        #plt.show()
    else:
        print("No solution found :(")

    # export json results
    with open(outputPath, 'w') as f:
        json.dump(result_dict, f)

ParseJson(jsonPath)
CofudLayout()