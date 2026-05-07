import Dexie from 'dexie';

export const db = new Dexie('DiwanOfflineDB');

db.version(1).stores({
  checkins: '++id, participantId, qrCode, timestamp, synced'
});

export const saveOfflineCheckin = async (participantId, qrCode) => {
  return await db.checkins.add({
    participantId,
    qrCode,
    timestamp: new Date().toISOString(),
    synced: 0
  });
};

export const getPendingCheckins = async () => {
  return await db.checkins.where('synced').equals(0).toArray();
};

export const markAsSynced = async (id) => {
  return await db.checkins.update(id, { synced: 1 });
};
