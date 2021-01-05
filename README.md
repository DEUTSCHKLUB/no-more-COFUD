# No More COFUD #
## Summary ##
COVID is bad for your physical health. Fear, Uncertainty, Doubt (FUD) are bad for your mental health. In 2020 we have seen the brutal combination of the two: COFUD.

We need to stay 2 meters apart, and we need to stay productive. How can we fit the most people into a space while still keeping 2 meters apart? No More COFUD solves this problem. No More COFUD uses constraint programming powered by the golem network to suggest optimized floor plan layouts - whether it is a restaurant or an office building.

This type of calculation can be very resource intensive so this project allows the calculation to be done on the decentralized golem network.

Think of it this way: every extra person we can safely fit inside a building is another person who can stay employed or enjoy a nice meal out in these trying times!

## Use ##
The web interface allows you to layout the room, furniture, and people that should fit inside the room.

Each piece of furniture or person in the room can be set as "fixed" so that they cannot be moved, and all other things need to be planned around their position.

Simply add the desired items to the room and click "Calculate NOFUD" to see a possible layout solution.

**Each grid location represents 1 foot. So 3 squares is roughly 1 meter.**

No solution possible? Try to adjust your settings or raise an issue if you believe you found a bug.

## Set-Up ##
* works best on NodeJS 14
* Install the yagna daemon as described in the [golem handbook](https://handbook.golem.network/requestor-tutorials/flash-tutorial-of-requestor-development)
* run the command `npm install`
* run the command `npm install --prefix worker install`
* run the `start.sh` script to automatically start the yagna daemon and run the web application
    * if you are already running the yagna daemon you may just run `PORT=3003 npm run start`
    * the PORT environment variable is important because the front-end is currently hard-coded to this port
* open your browser and go to: http://localhost:3003/

## Tips & Tricks ##
* You can make non-rectangular rooms by blocking out portions of the overall rectangular area with a fixed object rectangle.

## Known Limitations ##
* Furniture can only be a single rectangle
* Walls and furniture do not count as a barrier between people and the 2 meter distance is still enforecd

## Potential Features ##
* Allow furniture to be multiple rectangles joined together
* Support for larger data sets in the web application
* Allow items to be rotated to fit
* Allow requiring people to be close to furniture, like desks
* Support automatically finding the maximum number of people that can fit in the space