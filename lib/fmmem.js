'use strict';
// Jembatan Node <-> fmmem.exe (mode serve). Satu proses persisten, perintah berantrian.
const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

class FMMem {
  constructor(exe = path.join(__dirname, '..', 'native', 'fmmem.exe')) { this.exe = exe; this.p = null; this.q = []; this.pid = null; }
  async start() {
    if (this.p) return this.pid;
    return new Promise((res, rej) => {
      const p = spawn(this.exe, ['serve'], { windowsHide: true });
      const rl = readline.createInterface({ input: p.stdout });
      let first = true;
      rl.on('line', line => {
        if (first) { first = false; if (line.startsWith('ready')) { this.p = p; this.pid = Number(line.split(' ')[1]); res(this.pid); } else { rej(new Error(line.replace(/^err /, ''))); } return; }
        const cb = this.q.shift(); if (cb) cb(line);
      });
      p.on('exit', () => { this.p = null; this.pid = null; const q = this.q; this.q = []; q.forEach(cb => cb('err proses fmmem berhenti')); if (first) rej(new Error('fmmem gagal start')); });
      p.on('error', rej);
    });
  }
  async cmd(s) {
    await this.start();
    return new Promise(res => { this.q.push(res); this.p.stdin.write(s + '\n'); });
  }
  async read(addr, len) { const r = await this.cmd(`read 0x${addr.toString(16)} ${len}`); return r === 'null' || r.startsWith('err') ? null : Buffer.from(r, 'hex'); }
  async write(addr, buf) { return (await this.cmd(`write 0x${addr.toString(16)} ${buf.toString('hex')}`)) === 'ok'; }
  async scanI32(v, max = 200) { const r = await this.cmd(`scani32 ${v} ${max}`); return r && !r.startsWith('err') ? r.split(' ').filter(Boolean).map(x => Number(BigInt(x))) : []; }
  async scan(hex, align = 1, max = 50) { const r = await this.cmd(`scan ${hex} ${align} ${max}`); return r && !r.startsWith('err') ? r.split(' ').filter(Boolean).map(x => Number(BigInt(x))) : []; }
  async focus() { return (await this.cmd('focus')) === 'ok'; }
  stop() { if (this.p) this.p.kill(); this.p = null; }
}
module.exports = FMMem;
