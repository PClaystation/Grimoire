import { type ClientMessage, type ServerMessage } from '../src/shared/play.js';
interface PlayServerDependencies {
    sendToSession: (sessionId: string, message: ServerMessage) => void;
}
export declare class PlayServer {
    private readonly dependencies;
    private readonly rooms;
    private readonly gameRoomIds;
    private readonly sessionRoomIds;
    private readonly sessionNames;
    constructor(dependencies: PlayServerDependencies);
    handleHello(sessionId: string, playerName: string): void;
    handleDisconnect(sessionId: string): void;
    handleMessage(sessionId: string, message: Exclude<ClientMessage, {
        type: 'hello';
    }>): void;
    private createRoom;
    private joinRoom;
    private leaveRoom;
    private selectDeck;
    private startGame;
    private applyGameAction;
    private takeOwnedCard;
    private placeOwnedCard;
    private getControllablePermanent;
    private getAutoBattlefieldPosition;
    private buildInitialCommandZone;
    private emitRoomSnapshots;
    private emitGameSnapshots;
    private buildRoomSnapshot;
    private buildGameSnapshot;
    private toTableCardSnapshot;
    private recordEvent;
    private generateUniqueRoomId;
    private createRoomPlayer;
    private getPlayerName;
    private getRoomBySession;
    private getRoomByGameId;
    private deleteRoom;
    private emitError;
    private normalizeDeckSelection;
    private formatZoneLabel;
}
export {};
