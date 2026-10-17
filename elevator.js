
/*
 * Elevator System - Low Level Design
 *
 * The building has multiple elevators.
 * A person requests an elevator from a floor and selects a destination.
 * The system assigns an elevator, and the elevator visits the requested floors.
 */

// These are the only directions an elevator can move in.
const Direction = {
  UP: "UP",
  DOWN: "DOWN",
  IDLE: "IDLE",
};

const DoorState = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
};

// --------------------------------------------------
// Elevator
// --------------------------------------------------
// Each elevator manages its own floor, direction,
// doors, and the floors it needs to visit.

class Elevator {
  constructor(id, minFloor, maxFloor) {
    this.id = id;
    this.minFloor = minFloor;
    this.maxFloor = maxFloor;

    // All elevators start at the ground floor.
    this.currentFloor = minFloor;
    this.direction = Direction.IDLE;
    this.doorState = DoorState.CLOSED;

    // A Set prevents the same floor from being added twice.
    this.stops = new Set();
  }

  addStop(floor) {
    if (floor < this.minFloor || floor > this.maxFloor) {
      throw new Error(`Floor ${floor} is outside elevator ${this.id}'s range`);
    }

    this.stops.add(floor);
    console.log(`Elevator ${this.id}: Floor ${floor} added to stops.`);
  }

  // For this basic design, the elevator visits the nearest
  // requested floor. A production system would use a smarter
  // algorithm to avoid unnecessary changes of direction.
  getNextStop() {
    const floors = [...this.stops];

    if (floors.length === 0) {
      return null;
    }

    floors.sort((a, b) => {
      const distanceA = Math.abs(a - this.currentFloor);
      const distanceB = Math.abs(b - this.currentFloor);

      return distanceA - distanceB;
    });

    return floors[0];
  }

  moveOneFloor() {
    // Don't move while the doors are open.
    // Close them first, then move on the next tick.
    if (this.doorState === DoorState.OPEN) {
      this.closeDoor();
      return;
    }

    const nextStop = this.getNextStop();

    // No pending stops means the elevator is idle.
    if (nextStop === null) {
      this.direction = Direction.IDLE;
      return;
    }

    // The elevator has arrived at a requested floor.
    if (nextStop === this.currentFloor) {
      this.openDoor();
      this.stops.delete(this.currentFloor);
      return;
    }

    // Move exactly one floor toward the next stop.
    if (nextStop > this.currentFloor) {
      this.direction = Direction.UP;
      this.currentFloor++;
    } else {
      this.direction = Direction.DOWN;
      this.currentFloor--;
    }

    console.log(
      `Elevator ${this.id} moving ${this.direction} to floor ${this.currentFloor}.`
    );

    // Open the doors as soon as we reach a requested floor.
    if (this.stops.has(this.currentFloor)) {
      this.openDoor();
      this.stops.delete(this.currentFloor);
    }
  }

  openDoor() {
    this.doorState = DoorState.OPEN;
    console.log(
      `Elevator ${this.id}: Doors OPEN at floor ${this.currentFloor}.`
    );
  }

  closeDoor() {
    this.doorState = DoorState.CLOSED;
    console.log(`Elevator ${this.id}: Doors CLOSED.`);
  }

  isIdle() {
    return this.stops.size === 0 &&
      this.doorState === DoorState.CLOSED;
  }

  getStatus() {
    return {
      id: this.id,
      currentFloor: this.currentFloor,
      direction: this.direction,
      doorState: this.doorState,
      pendingStops: [...this.stops],
    };
  }
}

// --------------------------------------------------
// ElevatorRequest
// --------------------------------------------------
// A request represents a passenger's journey from one
// floor to another.

class ElevatorRequest {
  constructor(sourceFloor, destinationFloor) {
    this.sourceFloor = sourceFloor;
    this.destinationFloor = destinationFloor;
  }

  getDirection() {
    if (this.destinationFloor > this.sourceFloor) {
      return Direction.UP;
    }

    if (this.destinationFloor < this.sourceFloor) {
      return Direction.DOWN;
    }

    return Direction.IDLE;
  }
}

// --------------------------------------------------
// Dispatcher
// --------------------------------------------------
// The dispatcher decides which elevator should handle
// a request. Keeping this logic separate makes it easy
// to introduce a better scheduling strategy later.

class Dispatcher {
  constructor(elevators) {
    this.elevators = elevators;
  }

  selectElevator(sourceFloor) {
    // Start with the first elevator as our best candidate.
    let bestElevator = this.elevators[0];

    for (const elevator of this.elevators) {
      const currentDistance = Math.abs(
        elevator.currentFloor - sourceFloor
      );

      const bestDistance = Math.abs(
        bestElevator.currentFloor - sourceFloor
      );

      // Pick whichever elevator is physically closer.
      if (currentDistance < bestDistance) {
        bestElevator = elevator;
      }
    }

    return bestElevator;
  }
}

// --------------------------------------------------
// ElevatorSystem
// --------------------------------------------------
// This is the main entry point used by the application.
// It creates requests, assigns elevators, and runs the
// simulation.

class ElevatorSystem {
  constructor(numberOfElevators, minFloor, maxFloor) {
    if (numberOfElevators < 1) {
      throw new Error("At least one elevator is required.");
    }

    this.minFloor = minFloor;
    this.maxFloor = maxFloor;

    this.elevators = [];

    for (let i = 1; i <= numberOfElevators; i++) {
      this.elevators.push(
        new Elevator(i, minFloor, maxFloor)
      );
    }

    this.dispatcher = new Dispatcher(this.elevators);
  }

  requestElevator(sourceFloor, destinationFloor) {
    // Validate the request before assigning an elevator.
    this.validateFloor(sourceFloor);
    this.validateFloor(destinationFloor);

    if (sourceFloor === destinationFloor) {
      throw new Error("Source and destination floors must differ.");
    }

    const request = new ElevatorRequest(
      sourceFloor,
      destinationFloor
    );

    console.log(
      `\nPassenger requests floor ${sourceFloor} -> ` +
      `floor ${destinationFloor} (${request.getDirection()}).`
    );

    // Find the closest elevator to the passenger.
    const elevator = this.dispatcher.selectElevator(sourceFloor);

    console.log(`Elevator ${elevator.id} assigned to the request.`);

    // The elevator first picks up the passenger, then
    // takes them to their destination.
    elevator.addStop(sourceFloor);
    elevator.addStop(destinationFloor);

    return elevator.id;
  }

  validateFloor(floor) {
    if (
      !Number.isInteger(floor) ||
      floor < this.minFloor ||
      floor > this.maxFloor
    ) {
      throw new Error(
        `Invalid floor ${floor}. Valid floors are ` +
        `${this.minFloor} to ${this.maxFloor}.`
      );
    }
  }

  // Advance every elevator by one simulation step.
  step() {
    for (const elevator of this.elevators) {
      elevator.moveOneFloor();
    }
  }

  // Keep running until all elevators finish their stops.
  runUntilIdle(maxSteps = 1000) {
    let steps = 0;

    while (!this.elevators.every((elevator) => elevator.isIdle())) {
      if (steps >= maxSteps) {
        throw new Error("Simulation exceeded the maximum number of steps.");
      }

      this.step();
      steps++;
    }

    console.log(`\nAll elevators are idle after ${steps} steps.`);
  }

  showStatus() {
    console.log("\nElevator status:");

    for (const elevator of this.elevators) {
      console.log(elevator.getStatus());
    }
  }
}

// --------------------------------------------------
// Example usage
// --------------------------------------------------

const building = new ElevatorSystem(
  3,  // Number of elevators
  0,  // Lowest floor
  10  // Highest floor
);

// Passenger 1 wants to travel from floor 2 to floor 8.
building.requestElevator(2, 8);

// Passenger 2 wants to travel from floor 7 to floor 1.
building.requestElevator(7, 1);

// Passenger 3 wants to travel from floor 4 to floor 6.
building.requestElevator(4, 6);

// Check the current position and pending stops.
building.showStatus();

// Run the simulation until every elevator finishes.
building.runUntilIdle();

// Check the final elevator positions.
building.showStatus();
