import { Injectable } from '@angular/core';
import Dexie from 'dexie';
import { from, BehaviorSubject, of, interval } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Seatt {
  rowId: number;
  seatId: number;
}

export interface SeatsUpdate {
  occupied: Array<Seatt>;
  released: Array<Seatt>;
}

export interface SeatsList {
  row: number;
  seats: number[];
}

export interface TakenSeats {
  taken: Array<SeatsList>;
  released: Array<SeatsList>;
}

const takenSeats: TakenSeats[] = [
  { taken: [{ row: 1, seats: [1, 2, 3, 4] }, { row: 2, seats: [1, 2, 6, 7, 8] }], released: [] },
  { taken: [{ row: 1, seats: [5, 6, 10, 11] }, { row: 2, seats: [10, 11, 12] }, { row: 2, seats: [16, 17, 18] }], released: [] },
  { taken: [], released: [{ row: 1, seats: [1, 2, 3] }] },
  { taken: [{ row: 3, seats: [12, 13, 14, 15] }], released: [] }
];

const takenSeats$ = interval(5000).pipe(
  map(val => takenSeats[val % takenSeats.length])
  // tap(v => console.log(v))
);

export interface RoomConfig {
  id?: number;
  roomName: string;
  rowCount: number;
  avgSeatsInRow: number;
  room?: {
    rows?: Array<{ seats: Array<number> }>; // seating = rows of seats w/ type id
  };
}

export interface SeatType {
  id?: number;
  name?: string;
  color?: string;
  price?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NewDbService extends Dexie {
  roomConfigs: Dexie.Table<RoomConfig, number>;
  seatTypes: Dexie.Table<SeatType, number>;
  takenSeats$ = takenSeats$;
  seatsUpdate$: BehaviorSubject<SeatsUpdate> = new BehaviorSubject(null);

  constructor() {

    super('SeatingAppDemo');

    this.version(1).stores({
      roomConfigs: '++id, name',
      seatTypes: '++id, name'
    });

    this.on('populate', () => {
      this.seatTypes.add({ id: 1, name: 'regular', price: null, color: '#666666' });
    });
  }

  saveRoomConfig(config) {
    if (!config.id) { // id === null, need to remove so dexie will generate id
      delete config.id;
    } // else - updating an existing config
    return from(this.roomConfigs.put(config));
  }

  getSeatTypes() {
    return from(this.seatTypes.toArray());
  }

  updateSeatTypes(types) {
    this.seatTypes.clear();
    types.forEach(type => {
      if (type.id) {
        this.seatTypes.put(type);
      } else {
        delete type.id;
        this.seatTypes.add(type);
      }
    });
  }

  isSeatOccupied(roomId, rowId, seatId) {
    return of(true);
  }

  getRoom(index) {
    return from(this.getRoomConfig(index)).pipe(
      map(room => {
        return toRoomFormValue(room);
      })
    );
  }

  getRoomConfig(index) {
    return index ? this.roomConfigs.get(+index) : Promise.resolve(null);
  }

  getRoomConfigs() {
    return this.roomConfigs.toArray();
  }

  saveRoom(config) {
    return from(this.saveRoomConfig(config));
  }
}

function toRoomFormValue(roomConfig: RoomConfig) {
  const room = roomConfig.room || {
    rows: Array.from({ length: roomConfig.rowCount }, (row) => ({
      seatCount: roomConfig.avgSeatsInRow,
      seats: Array.from({ length: roomConfig.avgSeatsInRow })
    }))
  };
  return {
    ...roomConfig,
    room
  };
}
