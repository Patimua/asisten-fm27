// fmmem — alat baca/tulis memori fm.exe untuk Asisten FM27.
// Mode CLI (eksplorasi) dan mode "serve" (baris JSON-ish lewat stdin/stdout untuk server Node).
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;

static class Native {
  [DllImport("kernel32.dll", SetLastError = true)] public static extern IntPtr OpenProcess(int access, bool inherit, int pid);
  [DllImport("kernel32.dll", SetLastError = true)] public static extern bool ReadProcessMemory(IntPtr h, IntPtr addr, byte[] buf, IntPtr size, out IntPtr read);
  [DllImport("kernel32.dll", SetLastError = true)] public static extern bool WriteProcessMemory(IntPtr h, IntPtr addr, byte[] buf, IntPtr size, out IntPtr written);
  [DllImport("kernel32.dll")] public static extern IntPtr VirtualQueryEx(IntPtr h, IntPtr addr, out MBI info, IntPtr len);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
  [DllImport("kernel32.dll", SetLastError = true)] public static extern IntPtr VirtualAllocEx(IntPtr h, IntPtr addr, IntPtr size, uint type, uint protect);
  [DllImport("kernel32.dll", SetLastError = true)] public static extern bool VirtualFreeEx(IntPtr h, IntPtr addr, IntPtr size, uint type);
  [DllImport("kernel32.dll", SetLastError = true)] public static extern bool VirtualProtectEx(IntPtr h, IntPtr addr, IntPtr size, uint prot, out uint old);
  [DllImport("kernel32.dll")] public static extern bool FlushInstructionCache(IntPtr h, IntPtr addr, IntPtr size);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [StructLayout(LayoutKind.Sequential)] public struct MBI { public IntPtr BaseAddress, AllocationBase; public uint AllocationProtect; public IntPtr RegionSize; public uint State, Protect, Type; }
}

class Mem {
  public IntPtr H; public Process P;
  public Mem(Process p) { P = p; H = Native.OpenProcess(0x0010 | 0x0020 | 0x0008 | 0x0400, false, p.Id); if (H == IntPtr.Zero) throw new Exception("OpenProcess gagal (" + Marshal.GetLastWin32Error() + ")"); }
  public static Process Find() {
    // Hanya Football Manager 27 (jendela berjudul "Football Manager 27"); jangan pernah menyentuh edisi lain.
    var pidEnv = Environment.GetEnvironmentVariable("FMMEM_PID");
    foreach (var p in Process.GetProcessesByName("fm")) {
      try {
        if (!string.IsNullOrEmpty(pidEnv)) { if (p.Id.ToString() == pidEnv) return p; continue; }
        if ((p.MainWindowTitle ?? "").Contains("Football Manager 27")) return p;
      } catch { }
    }
    return null;
  }
  public byte[] Read(long a, int n) { var b = new byte[n]; IntPtr r; if (!Native.ReadProcessMemory(H, (IntPtr)a, b, (IntPtr)n, out r) || (long)r != n) return null; return b; }
  public bool Write(long a, byte[] b) { IntPtr w; return Native.WriteProcessMemory(H, (IntPtr)a, b, (IntPtr)b.Length, out w) && (long)w == b.Length; }
  public List<long[]> Regions() {
    var list = new List<long[]>(); long a = 0x10000; Native.MBI m;
    while (a < 0x7FFFFFFFFFFF && (long)Native.VirtualQueryEx(H, (IntPtr)a, out m, (IntPtr)Marshal.SizeOf(typeof(Native.MBI))) != 0) {
      long size = (long)m.RegionSize; if (size <= 0) break;
      bool rw = (m.Protect & 0x04) != 0 || (m.Protect & 0x40) != 0; // RW / ERW
      if (m.State == 0x1000 && rw && (m.Protect & 0x100) == 0 && m.Type == 0x20000) list.Add(new long[] { (long)m.BaseAddress, size }); // MEM_PRIVATE
      a = (long)m.BaseAddress + size;
    }
    return list;
  }
  // Cari pola byte di seluruh memori privat RW (aligned)
  public List<long> Scan(byte[] pat, int align, int max) {
    var res = new List<long>();
    foreach (var r in Regions()) {
      long off = 0; const int CH = 8 << 20;
      while (off < r[1]) {
        int n = (int)Math.Min(CH, r[1] - off); var b = Read(r[0] + off, n);
        if (b != null) {
          for (int i = 0; i <= n - pat.Length; i += align) {
            if (b[i] != pat[0]) continue; bool ok = true;
            for (int j = 1; j < pat.Length; j++) if (b[i + j] != pat[j]) { ok = false; break; }
            if (ok) { res.Add(r[0] + off + i); if (res.Count >= max) return res; }
          }
        }
        off += n;
      }
    }
    return res;
  }
}

static class Program {
  static string Hex(byte[] b) { if (b == null) return "null"; var sb = new StringBuilder(); foreach (var x in b) sb.Append(x.ToString("x2")); return sb.ToString(); }
  static byte[] Unhex(string s) { var b = new byte[s.Length / 2]; for (int i = 0; i < b.Length; i++) b[i] = byte.Parse(s.Substring(i * 2, 2), NumberStyles.HexNumber); return b; }
  static long Num(string s) { return s.StartsWith("0x") ? long.Parse(s.Substring(2), NumberStyles.HexNumber) : long.Parse(s); }

  static string Run(Mem m, string[] a) {
    switch (a[0]) {
      case "ping": return "ok " + m.P.Id;
      case "regions": { long t = 0; var r = m.Regions(); foreach (var x in r) t += x[1]; return r.Count + " regions " + (t >> 20) + " MB"; }
      case "read": return Hex(m.Read(Num(a[1]), (int)Num(a[2])));
      case "alloc": { // alloc <dekat-alamat> <ukuran> : memori RWX dalam ±1 GB dari alamat (untuk jmp rel32)
        long near = Num(a[1]); int size = (int)Num(a[2]);
        for (long d = 0x10000; d < 0x40000000; d += 0x10000) {
          foreach (long c in new[] { (near & ~0xFFFFL) - d, (near & ~0xFFFFL) + d }) {
            var r = Native.VirtualAllocEx(m.H, (IntPtr)c, (IntPtr)size, 0x3000, 0x40);
            if (r != IntPtr.Zero) return "ok 0x" + r.ToInt64().ToString("x");
          }
        }
        return "err alloc gagal";
      }
      case "free": return Native.VirtualFreeEx(m.H, (IntPtr)Num(a[1]), IntPtr.Zero, 0x8000) ? "ok" : "fail";
      case "wcode": { // wcode <addr> <hex> : tulis ke halaman kode (ubah proteksi sementara)
        long ad = Num(a[1]); var bytes = Unhex(a[2]); uint old;
        if (!Native.VirtualProtectEx(m.H, (IntPtr)ad, (IntPtr)bytes.Length, 0x40, out old)) return "err protect " + Marshal.GetLastWin32Error();
        bool ok = m.Write(ad, bytes); uint tmp; Native.VirtualProtectEx(m.H, (IntPtr)ad, (IntPtr)bytes.Length, old, out tmp);
        Native.FlushInstructionCache(m.H, (IntPtr)ad, (IntPtr)bytes.Length);
        return ok ? "ok" : "fail";
      }
      case "write": return m.Write(Num(a[1]), Unhex(a[2])) ? "ok" : "fail";
      case "scan": { // scan <hex> <align> <max>
        var r = m.Scan(Unhex(a[1]), a.Length > 2 ? (int)Num(a[2]) : 1, a.Length > 3 ? (int)Num(a[3]) : 50);
        var sb = new StringBuilder(); foreach (var x in r) sb.Append("0x").Append(x.ToString("x")).Append(' '); return sb.ToString().Trim();
      }
      case "aob": { // aob <pola: "48 8B 0D ?? ..." tanpa spasi, ?? = wildcard> <max> : cari di image game_plugin.dll
        long lo = 0, hi = 0;
        m.P.Refresh(); foreach (ProcessModule md in m.P.Modules) if (md.ModuleName.Equals("game_plugin.dll", StringComparison.OrdinalIgnoreCase)) { lo = md.BaseAddress.ToInt64(); hi = lo + md.ModuleMemorySize; }
        if (lo == 0) return "err game_plugin.dll belum dimuat";
        string ps = a[1]; int pn = ps.Length / 2; var pv = new int[pn];
        for (int i = 0; i < pn; i++) { string t = ps.Substring(i * 2, 2); pv[i] = t == "??" ? -1 : int.Parse(t, NumberStyles.HexNumber); }
        int max = a.Length > 2 ? (int)Num(a[2]) : 5; var sb = new StringBuilder(); int found = 0;
        const int CH = 1 << 20;
        for (long p = lo; p < hi && found < max; p += CH - pn) {
          int n = (int)Math.Min(CH, hi - p); var b = m.Read(p, n);
          if (b == null) { // baca per halaman bila sebagian tidak terbaca
            continue;
          }
          for (int i = 0; i + pn <= b.Length && found < max; i++) {
            int j = 0; for (; j < pn; j++) if (pv[j] >= 0 && b[i + j] != pv[j]) break;
            if (j == pn) { sb.Append("0x").Append((p + i).ToString("x")).Append(' '); found++; }
          }
        }
        return ("ok " + sb.ToString()).Trim();
      }
      case "scani32": { var v = BitConverter.GetBytes((int)Num(a[1])); var r = m.Scan(v, 4, a.Length > 2 ? (int)Num(a[2]) : 200); var sb = new StringBuilder(); foreach (var x in r) sb.Append("0x").Append(x.ToString("x")).Append(' '); return sb.ToString().Trim(); }
      case "readmany": { // readmany <len> <addr1,addr2,...>
        int n = (int)Num(a[1]); var sb = new StringBuilder();
        foreach (var s in a[2].Split(',')) { if (s.Length == 0) continue; sb.Append(Hex(m.Read(Num(s), n))).Append(' '); }
        return sb.ToString().Trim();
      }
      case "findrecs": { // findrecs <in: baris "uid pa"> <out> <paOffset(neg)> : satu lintasan memori
        var want = new Dictionary<int, int>();
        foreach (var l in System.IO.File.ReadAllLines(a[1])) { var t = l.Split(' '); if (t.Length >= 2) want[int.Parse(t[0])] = int.Parse(t[1]); }
        int paOff = (int)Num(a[3]); var sb = new StringBuilder(); int found = 0; var done = new HashSet<int>();
        foreach (var r in m.Regions()) {
          long off = 0; const int CH = 8 << 20;
          while (off < r[1]) {
            int n = (int)Math.Min(CH, r[1] - off); var b = m.Read(r[0] + off, n);
            if (b != null) for (int i = 0x40; i <= n - 8; i += 4) {
              int v = BitConverter.ToInt32(b, i); int pa;
              if (v > 0 && want.TryGetValue(v, out pa) && !done.Contains(v) && (paOff == 0 || BitConverter.ToInt16(b, i + paOff) == pa) && BitConverter.ToInt32(b, i + 4) == v && BitConverter.ToInt64(b, i - 0xc) > 0x7ff000000000L) {
                done.Add(v); found++; sb.Append(v).Append(' ').Append((r[0] + off + i).ToString("x")).Append('\n');
              }
            }
            off += n;
          }
        }
        System.IO.File.WriteAllText(a[2], sb.ToString()); return "found " + found;
      }
      case "index": { // index <out> : semua objek pemain/staf via vtable → RTTI-meta (layout FMSuperScout, MIT)
        long gpLo = 0, gpHi = 0, gaLo = 0, gaHi = 0; string gpVer = "";
        m.P.Refresh();
        m.P.Refresh(); foreach (ProcessModule md in m.P.Modules) {
          long b0 = md.BaseAddress.ToInt64(), e0 = b0 + md.ModuleMemorySize;
          if (md.ModuleName.Equals("game_plugin.dll", StringComparison.OrdinalIgnoreCase)) { gpLo = b0; gpHi = e0; try { gpVer = md.FileVersionInfo.FileVersion; } catch { } }
          if (md.ModuleName.Equals("GameAssembly.dll", StringComparison.OrdinalIgnoreCase)) { gaLo = b0; gaHi = e0; }
        }
        if (gpLo == 0) return "err game_plugin.dll belum dimuat (muat save dulu)";
        long lo = Math.Min(gpLo, gaLo == 0 ? gpLo : gaLo), hi = Math.Max(gpHi, gaHi);
        var cache = new Dictionary<long, int>(); var seen = new HashSet<uint>();
        var sb = new StringBuilder(); int np = 0, ns = 0;
        foreach (var r in m.Regions()) {
          if (r[1] > (512L << 20)) continue;
          long off = 0; const int CH = 16 << 20;
          while (off < r[1]) {
            int n = (int)Math.Min(CH, r[1] - off); var b = m.Read(r[0] + off, n);
            if (b != null) for (int i = 0; i + 0x10 <= n; i += 8) {
              long vt = BitConverter.ToInt64(b, i);
              if (vt < lo || vt >= hi) continue;
              if (!((vt >= gpLo && vt < gpHi) || (vt >= gaLo && vt < gaHi))) continue;
              int dyn;
              if (!cache.TryGetValue(vt, out dyn)) {
                dyn = 0; var mp = m.Read(vt - 8, 8);
                if (mp != null) { long meta = BitConverter.ToInt64(mp, 0); var mi = meta > 0x10000 ? m.Read(meta + 4, 4) : null; if (mi != null) dyn = BitConverter.ToInt32(mi, 0); }
                cache[vt] = dyn;
              }
              char kind = dyn == 0x288 || dyn == 0x380 ? 'P' : dyn == 0x100 ? 'S' : dyn == 0x440 ? 'M' : '\0';
              if (kind == '\0') continue;
              uint uid = BitConverter.ToUInt32(b, i + 0xC);
              if (uid == 0 || uid == 0xFFFFFFFF) continue;
              long p = r[0] + off + i;
              int caOff = kind == 'P' ? 0x264 : 0xDA;
              var cp = m.Read(p - dyn + caOff, 4); if (cp == null) continue;
              int ca = BitConverter.ToUInt16(cp, 0), pa = BitConverter.ToUInt16(cp, 2);
              if (ca < 1 || ca > 200 || pa < 1 || pa > 200) continue;
              if (!seen.Add(uid)) continue;
              if (kind == 'P') np++; else ns++;
              sb.Append(uid).Append(' ').Append(kind).Append(' ').Append(dyn.ToString("x")).Append(' ').Append(p.ToString("x")).Append(' ').Append(ca).Append(' ').Append(pa).Append('\n');
            }
            off += n > 16 && off + n < r[1] ? n - 16 : n;
          }
        }
        System.IO.File.WriteAllText(a[1], sb.ToString());
        return "ok " + np + " " + ns + " " + gpVer;
      }
      case "wfile": { // wfile <file> : baris "addrhex bytehex" → tulis banyak sekaligus
        int ok = 0, bad = 0;
        foreach (var l in System.IO.File.ReadAllLines(a[1])) { var t = l.Split(' '); if (t.Length < 2) continue; if (m.Write(long.Parse(t[0], NumberStyles.HexNumber), Unhex(t[1]))) ok++; else bad++; }
        return "ok " + ok + " " + bad;
      }
      case "rfile": { // rfile <in: baris "addrhex len"> <out> : baca banyak sekaligus
        var sb = new StringBuilder();
        foreach (var l in System.IO.File.ReadAllLines(a[1])) { var t = l.Split(' '); if (t.Length < 2) continue; sb.Append(Hex(m.Read(long.Parse(t[0], NumberStyles.HexNumber), int.Parse(t[1])))).Append('\n'); }
        System.IO.File.WriteAllText(a[2], sb.ToString()); return "ok";
      }
      case "focus": { var h = m.P.MainWindowHandle; if (Native.IsIconic(h)) Native.ShowWindow(h, 9); return Native.SetForegroundWindow(h) ? "ok" : "fail"; }
      default: return "err unknown";
    }
  }

  static int Main(string[] args) {
    try {
      var p = Mem.Find(); if (p == null) { Console.WriteLine("err Football Manager 27 tidak berjalan"); return 2; }
      var m = new Mem(p);
      if (args.Length > 0 && args[0] == "serve") {
        Console.WriteLine("ready " + p.Id); Console.Out.Flush();
        string line;
        while ((line = Console.ReadLine()) != null) {
          string outp;
          try { var parts = line.Trim().Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries); outp = parts.Length == 0 ? "err empty" : Run(m, parts); }
          catch (Exception e) { outp = "err " + e.Message.Replace('\n', ' '); }
          Console.WriteLine(outp); Console.Out.Flush();
        }
        return 0;
      }
      Console.WriteLine(Run(m, args));
      return 0;
    } catch (Exception e) { Console.WriteLine("err " + e.Message); return 1; }
  }
}
