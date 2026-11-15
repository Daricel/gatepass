import { EventEmitter } from "node:events";

export interface LiveStats {
  registered: number;
  checkedIn: number;
  lastCheckIn?: { name: string; at: string };
}

/** In-process pub/sub for per-event stats, consumed by Server-Sent Events.
 *  (For multiple server instances this would become Redis pub/sub.) */
class LiveHub {
  private emitter = new EventEmitter().setMaxListeners(0);

  publish(eventId: number, stats: LiveStats) {
    this.emitter.emit(`event:${eventId}`, stats);
  }

  subscribe(eventId: number, listener: (stats: LiveStats) => void) {
    this.emitter.on(`event:${eventId}`, listener);
    return () => this.emitter.off(`event:${eventId}`, listener);
  }
}

export const liveHub = new LiveHub();
