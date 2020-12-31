# No More COFUD #
## Summary ##
COVID is bad for your physical health. Fear, Uncertainty, Doubt (FUD) are bad for your mental health. In 2020 we have seen the brutal combination of the two: COFUD.

We need to stay 2 meters apart, and we need to stay productive. How can we fit the most people into a space while still keeping 2 meters apart? No More COFUD solves this problem. No More COFUD will use constraint programming powered by the golem network to suggest optimized floor plan layouts - whether it is a restaurant or an office building.

This type of calculation can be very resource intensive so this project allows the calculation to be done on the decentralized golem network.

Think of it this way: every extra person we can safely fit inside a building is another person who can stay employed or enjoy a nice meal out in these trying times!

This is a proof-of-concept application.

## Use ##
The web interface allows you to layout the room, furniture, and people that should fit inside the room.

Each piece of furniture or person in the room can be set as "fixed" so that they cannot be moved, and all other things need to be planned around their position.

Simply add the desired items to the room and click "Suggest Layout" to see a possible layout solution.

No solution possible? Try to adjust your settings or raise an issue if you believe you found a bug.

## Set-Up ##
> npm install  
> npm run start

## Tips & Tricks ##
* You can make non-rectangular rooms by blocking out portions of the overall rectangular area with a fixed `Wall` type rectangle.

## Known Limitations ##
* Furniture can only be a single rectangle
* Furniture and walls are not considered when calculating the distance between people.

## Potential Features ##
* Allow furniture to be multiple rectangles joined together
* Allow items to be rotated to fit
* Support automatically finding the maximum number of people that can fit in the space