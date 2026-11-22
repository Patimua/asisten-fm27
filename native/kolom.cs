// kolom — angka CA/PA ditempel di samping kolom "Posisi" pada tabel pemain FM27 (skuad, U20/U18, pencarian, transfer…).
// Cara kerja: saat FM aktif, isi jendela ditangkap (PrintWindow), dibaca dengan OCR bawaan Windows (Windows.Media.Ocr),
// judul kolom "Pemain/Player/Nama" + "Posisi/Position" dicari, nama tiap baris dicocokkan ke data Asisten (POST /api/kolom),
// lalu angka digambar di jendela transparan yang tembus klik. Gambar tidak berubah = OCR dilewati (hemat CPU).
// Pakai: kolom.exe [http://localhost:2728] [debug]
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using Windows.Foundation;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Security.Cryptography;

class Kolom : Form {
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern bool PrintWindow(IntPtr h, IntPtr dc, uint f);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
  [StructLayout(LayoutKind.Sequential)] struct RECT { public int L, T, R, B; }

  class Lbl { public int X, Y, H; public int Ca, Pa; }
  readonly string srv; volatile List<Lbl> labels = new List<Lbl>(); volatile bool showWanted; Rectangle fmRect;
  readonly Dictionary<string, int[]> cache = new Dictionary<string, int[]>(); DateTime lastOk = DateTime.Now;
  static readonly Color ORANGE = Color.FromArgb(242, 140, 40), KEY = Color.FromArgb(255, 0, 255);
  static readonly string[] H_NAME = { "pemain", "player", "nama", "name" }, H_POS = { "posisi", "position", "pos" };

  Kolom(string s, bool test) { srv = s; }
  Kolom(string s) {
    srv = s; FormBorderStyle = FormBorderStyle.None; ShowInTaskbar = false; TopMost = true; StartPosition = FormStartPosition.Manual;
    BackColor = KEY; TransparencyKey = KEY; DoubleBuffered = true; Bounds = new Rectangle(-32000, -32000, 10, 10);
    var t = new System.Windows.Forms.Timer { Interval = 100 }; t.Tick += (o, e) => Sync(); t.Start();
    new Thread(Work) { IsBackground = true }.Start();
  }
  protected override CreateParams CreateParams { get { var c = base.CreateParams; c.ExStyle |= 0x80000 | 0x20 | 0x80 | 0x8000000; return c; } } // layered, tembus klik, toolwindow, tidak merebut fokus
  protected override bool ShowWithoutActivation { get { return true; } }

  static IntPtr FindFm() { foreach (var p in Process.GetProcessesByName("fm")) { try { if ((p.MainWindowTitle ?? "").Contains("Football Manager")) return p.MainWindowHandle; } catch { } } return IntPtr.Zero; }
  IntPtr fm = IntPtr.Zero; DateTime fmScan = DateTime.MinValue;
  bool FmActive() {
    if (fm == IntPtr.Zero || (DateTime.Now - fmScan).TotalSeconds > 3) { fm = FindFm(); fmScan = DateTime.Now; }
    var fg = GetForegroundWindow(); return fm != IntPtr.Zero && !IsIconic(fm) && (fg == fm || fg == Handle);
  }
  void Sync() { // utas UI: tampilkan/sembunyikan & posisikan jendela lapisan
    bool show = showWanted && labels.Count > 0;
    if (show) { if (Bounds != fmRect) Bounds = fmRect; if (!Visible) Show(); Invalidate(); }
    else if (Visible) Hide();
    if ((DateTime.Now - lastOk).TotalSeconds > 90) Environment.Exit(0); // server Asisten mati → keluar
  }

  static R Wait<R>(IAsyncOperation<R> op) { while (op.Status == AsyncStatus.Started) Thread.Sleep(3); if (op.Status != AsyncStatus.Completed) throw new Exception("ocr " + op.Status); return op.GetResults(); }

  void Work() {
    OcrEngine eng = null; try { eng = OcrEngine.TryCreateFromUserProfileLanguages(); } catch (Exception ex) { Dbg("ocr tidak tersedia: " + ex.Message); }
    long lastHash = 0; Rectangle lastRect = Rectangle.Empty;
    while (true) {
      try {
        Ping();
        bool act = eng != null && FmActive(); showWanted = act;
        if (!act) { Thread.Sleep(400); continue; }
        RECT r; GetWindowRect(fm, out r); var rect = Rectangle.FromLTRB(r.L, r.T, r.R, r.B);
        int w = rect.Width, h = rect.Height; if (w < 400 || h < 300) { Thread.Sleep(400); continue; }
        byte[] buf; long hash;
        using (var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
          using (var g = Graphics.FromImage(bmp)) { var dc = g.GetHdc(); try { PrintWindow(fm, dc, 2); } finally { g.ReleaseHdc(dc); } }
          var bd = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
          buf = new byte[w * 4 * h]; for (int y = 0; y < h; y++) Marshal.Copy(bd.Scan0 + y * bd.Stride, buf, y * w * 4, w * 4);
          bmp.UnlockBits(bd);
        }
        hash = 1469598103934665603L; for (int i = 0; i < buf.Length; i += 4 * 37) hash = (hash ^ buf[i] ^ (buf[i + 1] << 8) ^ (buf[i + 2] << 16)) * 1099511628211L;
        if (hash == lastHash && rect == lastRect) { Thread.Sleep(250); continue; }
        if (rect != lastRect) labels = new List<Lbl>(); // jendela berpindah/berubah ukuran → angka lama disembunyikan
        lastHash = hash; lastRect = rect;
        var sb = SoftwareBitmap.CreateCopyFromBuffer(CryptographicBuffer.CreateFromByteArray(buf), BitmapPixelFormat.Bgra8, w, h, BitmapAlphaMode.Premultiplied);
        var res = Wait(eng.RecognizeAsync(sb));
        var nl = Parse(res);
        fmRect = rect; labels = nl;
        Thread.Sleep(nl.Count > 0 ? 150 : 2000); // tanpa tabel (mis. layar pertandingan 3D yang terus berubah): periksa jarang saja
      } catch (Exception ex) { Dbg("err " + ex.Message); Thread.Sleep(1000); }
    }
  }
  void Ping() { if ((DateTime.Now - lastOk).TotalSeconds < 20) return; try { var rq = (HttpWebRequest)WebRequest.Create(srv + "/api/settings"); rq.Timeout = 2000; rq.Proxy = null; using (rq.GetResponse()) { } lastOk = DateTime.Now; } catch { } }

  class W { public string T; public double X, Y, R, H; }
  List<Lbl> Parse(OcrResult res) {
    var lines = new List<W>(); var words = new List<W>();
    foreach (var l in res.Lines) {
      var f = l.Words[0].BoundingRect; double right = 0, hh = 0; foreach (var x in l.Words) { right = Math.Max(right, x.BoundingRect.X + x.BoundingRect.Width); hh = Math.Max(hh, x.BoundingRect.Height); }
      lines.Add(new W { T = l.Text, X = f.X, Y = f.Y, R = right, H = hh });
      foreach (var x in l.Words) words.Add(new W { T = x.Text, X = x.BoundingRect.X, Y = x.BoundingRect.Y, R = x.BoundingRect.X + x.BoundingRect.Width, H = x.BoundingRect.Height });
    }
    var outL = new List<Lbl>();
    foreach (var hn in words.Where(x => H_NAME.Contains(x.T.ToLowerInvariant()))) {
      var hp = words.Where(x => H_POS.Contains(x.T.ToLowerInvariant()) && Math.Abs(x.Y - hn.Y) < 6 && x.X > hn.X).OrderBy(x => x.X).FirstOrDefault();
      if (hp == null) continue;
      var nextH = words.Where(x => Math.Abs(x.Y - hn.Y) < 6 && x.X > hp.R + 4).OrderBy(x => x.X).FirstOrDefault();
      double nextX = nextH != null ? nextH.X : hp.X + 260;
      // baris: teks yang mulai di kolom nama (antara judul "Pemain" dan "Posisi"), di bawah judul
      var rows = lines.Where(x => x.Y > hn.Y + hn.H + 4 && x.X >= hn.X - 30 && x.X < hp.X - 20 && Regex.IsMatch(x.T, "[A-Za-zÀ-ÿ]{2,}")).OrderBy(x => x.Y).ToList();
      if (rows.Count > 2) { var hs = rows.Select(x => x.H).OrderBy(x => x).ToList(); double med = hs[hs.Count / 2]; rows = rows.Where(x => x.H <= med * 1.45 && x.H >= med * 0.6).ToList(); } // buang teks pop-up / judul besar
      var names = new List<string>(); var keep = new List<W>();
      foreach (var rw in rows) { var t = Regex.Replace(rw.T, @"^[^A-Za-zÀ-ÿ]+", "").Trim(); if (t.Length < 3) continue; names.Add(t); keep.Add(rw); }
      Dbg("tabel: judul Pemain@" + (int)hn.X + "," + (int)hn.Y + " Posisi@" + (int)hp.X + " baris " + names.Count + " contoh " + string.Join(" | ", names.Take(4)));
      if (names.Count == 0) continue;
      var vals = Lookup(names);
      var hs2 = keep.Select(x => x.H).OrderBy(x => x).ToList(); double medH = hs2[hs2.Count / 2]; // satu ukuran untuk semua label di tabel ini
      int lh = (int)Math.Round(medH * 1.6); double right = nextX - Math.Max(6, lh * 0.35); // rata kanan di ujung kolom Posisi
      for (int i = 0; i < keep.Count; i++) {
        var v = vals[i]; if (v == null) continue; var rw = keep[i]; double cy = rw.Y + rw.H / 2;
        outL.Add(new Lbl { X = (int)right, Y = (int)Math.Round(cy - lh / 2.0), H = lh, Ca = v[0], Pa = v[1] }); // X = tepi kanan label
      }
    }
    Dbg("label " + outL.Count);
    return outL;
  }
  int[][] Lookup(List<string> names) {
    var miss = names.Where(n => !cache.ContainsKey(n)).Distinct().ToList();
    if (miss.Count > 0) {
      try {
        var js = "{\"names\":[" + string.Join(",", miss.Select(n => "\"" + n.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"")) + "]}";
        var rq = (HttpWebRequest)WebRequest.Create(srv + "/api/kolom"); rq.Method = "POST"; rq.ContentType = "application/json"; rq.Timeout = 3000; rq.Proxy = null;
        var bb = Encoding.UTF8.GetBytes(js); using (var s = rq.GetRequestStream()) s.Write(bb, 0, bb.Length);
        string body; using (var rs = rq.GetResponse()) using (var sr = new StreamReader(rs.GetResponseStream(), Encoding.UTF8)) body = sr.ReadToEnd();
        lastOk = DateTime.Now;
        var ms = Regex.Matches(body, "\"(-|\\d+ \\d+)\"");
        for (int i = 0; i < miss.Count && i < ms.Count; i++) { var t = ms[i].Groups[1].Value; cache[miss[i]] = t == "-" ? null : t.Split(' ').Select(int.Parse).ToArray(); }
        if (cache.Count > 3000) cache.Clear();
      } catch (Exception ex) { Dbg("api " + ex.Message); }
    }
    return names.Select(n => cache.ContainsKey(n) ? cache[n] : null).ToArray();
  }

  static Color Col(int v) { return v >= 170 ? Color.FromArgb(74, 222, 128) : v >= 140 ? Color.FromArgb(163, 230, 53) : v >= 110 ? Color.FromArgb(250, 204, 21) : v >= 80 ? Color.FromArgb(251, 146, 60) : Color.FromArgb(226, 232, 240); }
  protected override void OnPaint(PaintEventArgs e) {
    var g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias; g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;
    foreach (var l in labels) {
      int H = l.H; var f = new Font("Segoe UI", H * 0.5f, FontStyle.Bold, GraphicsUnit.Pixel);
      string a = l.Ca.ToString(), b = l.Pa.ToString();
      var sa = g.MeasureString(a, f, PointF.Empty, StringFormat.GenericTypographic); var ss = g.MeasureString("/", f, PointF.Empty, StringFormat.GenericTypographic); var sp = g.MeasureString(b, f, PointF.Empty, StringFormat.GenericTypographic);
      int pad = (int)(H * 0.3), W = (int)(sa.Width + ss.Width + sp.Width + pad * 2 + H * 0.15);
      var rc = new Rectangle(l.X - W, l.Y, W, H); int rr = Math.Max(4, H / 4);
      using (var gp = new GraphicsPath()) {
        int d = rr * 2; gp.AddArc(rc.X, rc.Y, d, d, 180, 90); gp.AddArc(rc.Right - d, rc.Y, d, d, 270, 90); gp.AddArc(rc.Right - d, rc.Bottom - d, d, d, 0, 90); gp.AddArc(rc.X, rc.Bottom - d, d, d, 90, 90); gp.CloseFigure();
        using (var bg = new SolidBrush(Color.FromArgb(18, 22, 30))) g.FillPath(bg, gp);
        using (var pn = new Pen(Color.FromArgb(150, ORANGE), Math.Max(1f, H / 22f))) g.DrawPath(pn, gp);
      }
      float x = rc.X + pad, y = l.Y + (H - sa.Height) / 2f;
      using (var br = new SolidBrush(Col(l.Ca))) g.DrawString(a, f, br, x, y, StringFormat.GenericTypographic); x += sa.Width + H * 0.05f;
      using (var br = new SolidBrush(Color.FromArgb(140, 150, 165))) g.DrawString("/", f, br, x, y, StringFormat.GenericTypographic); x += ss.Width + H * 0.05f;
      using (var br = new SolidBrush(Col(l.Pa))) g.DrawString(b, f, br, x, y, StringFormat.GenericTypographic);
      f.Dispose();
    }
  }
  // Koordinat label = koordinat di dalam tangkapan jendela FM = koordinat di dalam jendela lapisan (posisi & ukurannya sama).

  static bool TEST = Environment.GetCommandLineArgs().Length > 1 && Environment.GetCommandLineArgs()[1] == "test";
  static readonly bool DEBUG = Environment.GetCommandLineArgs().Length > 2 && Environment.GetCommandLineArgs()[2] == "debug";
  static DateTime lastDbg = DateTime.MinValue; static string lastMsg = "";
  static void Dbg(string s) { if (TEST) Console.WriteLine(s); if (!DEBUG || (s == lastMsg && (DateTime.Now - lastDbg).TotalSeconds < 5)) return; lastMsg = s; lastDbg = DateTime.Now; try { File.AppendAllText(Path.Combine(Path.GetDirectoryName(Application.ExecutablePath), "kolom.log"), DateTime.Now.ToString("HH:mm:ss.fff ") + s + "\r\n"); } catch { } }
  static void TestFile(string png, string srv) { // kolom.exe test <gambar.png>: OCR + pencocokan tanpa jendela
    var k = new Kolom(srv, true); var bmp = new Bitmap(png); int w = bmp.Width, h = bmp.Height;
    var bd = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb); var buf = new byte[w * 4 * h];
    for (int y = 0; y < h; y++) Marshal.Copy(bd.Scan0 + y * bd.Stride, buf, y * w * 4, w * 4); bmp.UnlockBits(bd);
    var sb = SoftwareBitmap.CreateCopyFromBuffer(CryptographicBuffer.CreateFromByteArray(buf), BitmapPixelFormat.Bgra8, w, h, BitmapAlphaMode.Premultiplied);
    var res = Wait(OcrEngine.TryCreateFromUserProfileLanguages().RecognizeAsync(sb)); var l = k.Parse(res);
    foreach (var x in l) Console.WriteLine(x.X + "," + x.Y + " h" + x.H + " " + x.Ca + "/" + x.Pa);
  }
  static Mutex MX;
  [STAThread] static void Main(string[] a) {
    try { SetProcessDPIAware(); } catch { }
    if (a.Length > 1 && a[0] == "test") { TestFile(a[1], a.Length > 2 ? a[2] : "http://localhost:2728"); return; }
    bool fresh; MX = new Mutex(true, "AsistenFM27_kolom", out fresh); if (!fresh) return;
    Application.ThreadException += (o, e) => Dbg("crash UI " + e.Exception);
    AppDomain.CurrentDomain.UnhandledException += (o, e) => Dbg("crash " + e.ExceptionObject);
    Application.EnableVisualStyles();
    Application.Run(new Kolom(a.Length > 0 ? a[0] : "http://localhost:2728"));
  }
}
