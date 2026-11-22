// pengawas — membuka Asisten FM27 setiap kali Teknik Oda dibuka.
// Dua pemicu (dicek tiap 0,5 dtk, hampir tanpa CPU):
//   1. proses TeknikOda.exe baru muncul (Teknik Oda dinyalakan), atau
//   2. jendela Teknik Oda menjadi jendela aktif (dibuka lagi dari tray / taskbar). Membuka Teknik Oda yang sudah
//      berjalan hanya membuat proses kedua yang hidup ±0,4 dtk lalu menyerahkan ke proses utama, jadi pemicu 1 saja
//      tidak cukup.
// Asisten hanya dibuka bila jendelanya belum ada, dan tidak dibuka bila Teknik Oda baru saja dibuka oleh peluncur
// Asisten sendiri (penanda data\oda-dibuka-asisten.txt < 60 dtk).
// Pakai: pengawas.exe   (satu salinan saja; folder Asisten = folder induk native\)
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

static class Pengawas {
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr l);

  static Mutex MX; // statis: jangan sampai dibuang GC (kunci satu salinan ikut lepas)
  static string Dir = Path.GetDirectoryName(Path.GetDirectoryName(Path.GetFullPath(System.Reflection.Assembly.GetExecutingAssembly().Location)));

  static bool AsistenOpen() { // jendela aplikasi Asisten (Edge --app, judul "Asisten FM27 …")
    bool found = false;
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h)) return true;
      var sb = new StringBuilder(256); GetWindowText(h, sb, 256);
      if (sb.ToString().StartsWith("Asisten FM27")) { found = true; return false; }
      return true;
    }, IntPtr.Zero);
    return found;
  }
  static void Log(string s) { try { File.AppendAllText(Path.Combine(Dir, "data", "pengawas.log"), DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss ") + s + "\r\n"); } catch { } }
  static void Launch(string why) {
    try {
      var mark = Path.Combine(Dir, "data", "oda-dibuka-asisten.txt");
      if (File.Exists(mark) && (DateTime.Now - File.GetLastWriteTime(mark)).TotalSeconds < 60) return;
      if (AsistenOpen()) return;
      var lk = Path.Combine(Dir, "data", "asisten-dibuka-pengawas.txt"); // jeda antar-salinan: peluncur butuh beberapa detik sampai jendelanya muncul
      if (File.Exists(lk) && (DateTime.Now - File.GetLastWriteTime(lk)).TotalSeconds < 30) return;
      File.WriteAllText(lk, DateTime.Now.ToString("s"));
      var l = new DirectoryInfo(Dir).GetFiles("Asisten FM27*.vbs").OrderByDescending(f => f.LastWriteTime).FirstOrDefault();
      if (l == null) { Log("peluncur tidak ditemukan"); return; }
      Log("membuka Asisten (" + why + ")");
      Process.Start(new ProcessStartInfo("wscript.exe", "\"" + l.FullName + "\"") { UseShellExecute = false, CreateNoWindow = true, WorkingDirectory = Dir });
    } catch (Exception e) { Log("gagal: " + e.Message); }
  }

  [STAThread] static void Main() {
    bool fresh; MX = new Mutex(true, "AsistenFM27_pengawas", out fresh); if (!fresh) return;
    var known = new HashSet<int>(Process.GetProcessesByName("TeknikOda").Select(p => p.Id));
    bool wasFg = false; DateTime last = DateTime.MinValue;
    while (true) {
      try {
        var now = Process.GetProcessesByName("TeknikOda").Select(p => p.Id).ToList();
        bool started = now.Any(id => !known.Contains(id)); known = new HashSet<int>(now);
        uint fp = 0; GetWindowThreadProcessId(GetForegroundWindow(), out fp);
        bool fg = now.Contains((int)fp) || IsOda(fp);
        if ((started || (fg && !wasFg)) && (DateTime.Now - last).TotalSeconds > 8) { last = DateTime.Now; Launch(started ? "Teknik Oda dinyalakan" : "jendela Teknik Oda dibuka"); }
        wasFg = fg;
      } catch { }
      Thread.Sleep(500);
    }
  }
  static bool IsOda(uint pid) { // proses kedua yang berumur pendek
    if (pid == 0) return false;
    try { return Process.GetProcessById((int)pid).ProcessName.Equals("TeknikOda", StringComparison.OrdinalIgnoreCase); } catch { return false; }
  }
}
