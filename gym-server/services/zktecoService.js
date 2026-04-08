const ZKLib = require('node-zklib');

const CONNECT_TIMEOUT = 5000;

class ZktecoService {
  constructor(ip, port = 4370) {
    this.ip = ip;
    this.port = port;
    this.zk = null;
  }

  async connect() {
    this.zk = new ZKLib(this.ip, this.port, CONNECT_TIMEOUT, 4000);
    await this.zk.createSocket();
  }

  async disconnect() {
    if (this.zk) {
      try {
        await this.zk.disconnect();
      } catch (err) {
        // Ignore disconnect errors — socket may already be closed
      }
      this.zk = null;
    }
  }

  async getAttendances() {
    try {
      await this.connect();
      const logs = await this.zk.getAttendances();
      return (logs.data || []).map((log) => ({
        deviceUserId: log.deviceUserId,
        timestamp: new Date(log.recordTime),
        raw: log,
      }));
    } finally {
      await this.disconnect();
    }
  }

  async getUsers() {
    try {
      await this.connect();
      const users = await this.zk.getUsers();
      return users.data || [];
    } finally {
      await this.disconnect();
    }
  }

  async setUser(uid, name, password = '', role = 0) {
    try {
      await this.connect();
      await this.zk.setUser(uid, name, password, role);
    } finally {
      await this.disconnect();
    }
  }

  async deleteUser(uid) {
    try {
      await this.connect();
      await this.zk.deleteUser(uid);
    } finally {
      await this.disconnect();
    }
  }

  async getInfo() {
    try {
      await this.connect();
      const info = await this.zk.getInfo();
      return info;
    } finally {
      await this.disconnect();
    }
  }

  async clearAttendanceLog() {
    try {
      await this.connect();
      await this.zk.clearAttendanceLog();
    } finally {
      await this.disconnect();
    }
  }
}

module.exports = ZktecoService;
