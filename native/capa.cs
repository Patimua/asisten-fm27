// capa â€” tombol CA/PA bergaya Teknik Oda, ditempel tepat di kanan tombol "Teknik Oda Â· Compare" di profil pemain FM27.
// Data: GET <server>/api/fmopen (Asisten FM27, memakai acik-oyuncu.json dari plugin Teknik Oda).
// Posisi: isi jendela FM ditangkap (PrintWindow) Â±1,5Ã—/dtk saat FM aktif; bingkai oranye tombol Teknik Oda dicari di area kepala profil.
// Tidak ada tombol Teknik Oda (bukan layar profil) â†’ badge disembunyikan. Klik kanan = sembunyikan sampai pemain berganti.
// Pakai: capa.exe [http://localhost:2728]
using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

class Capa : Form {
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool PrintWindow(IntPtr h, IntPtr dc, uint f);
  [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
  [StructLayout(LayoutKind.Sequential)] struct RECT { public int L, T, R, B; }
  static readonly Color ORANGE = Color.FromArgb(208, 116, 18), BG = Color.FromArgb(2, 2, 5);
  string srv; string name = "", lastKey = "", hiddenKey = null; int ca = -1, pa = -1; bool found;
  IntPtr fm = IntPtr.Zero; DateTime lastFmScan = DateTime.MinValue, lastOk = DateTime.Now, lastCap = DateTime.MinValue;
  volatile string pending; Rectangle anchor = Rectangle.Empty; // tombol Compare, koordinat layar

  protected override bool ShowWithoutActivation { get { return true; } }
  protected override CreateParams CreateParams { get { var c = base.CreateParams; c.ExStyle |= 0x08000000 | 0x00000080 | 0x00000008; return c; } }

  Capa(string s) {
    srv = s.TrimEnd('/').Replace("//localhost", "//127.0.0.1"); // "localhost" â†’ coba IPv6 dulu, lambat >1,5 dtk
    FormBorderStyle = FormBorderStyle.None; ShowInTaskbar = false; TopMost = true; StartPosition = FormStartPosition.Manual;
    BackColor = BG; DoubleBuffered = true; Location = new Point(-3000, -3000); Size = new Size(180, 38);
    MouseDown += (o, e) => { if (e.Button == MouseButtons.Right) { hiddenKey = lastKey; Hide(); } };
    new Thread(Poll) { IsBackground = true }.Start();
    var t = new System.Windows.Forms.Timer { Interval = 120 }; t.Tick += Tick; t.Start();
  }
  void Poll() {
    while (true) {
      try {
        var rq = (HttpWebRequest)WebRequest.Create(srv + "/api/fmopen"); rq.Timeout = 1500; rq.Proxy = null;
        using (var rs = rq.GetResponse()) using (var sr = new StreamReader(rs.GetResponseStream(), Encoding.UTF8)) pending = sr.ReadToEnd();
        lastOk = DateTime.Now;
      } catch { }
      if ((DateTime.Now - lastOk).TotalSeconds > 90) Environment.Exit(0);
      Thread.Sleep(400);
    }
  }
  static string S(string j, string k) { var m = Regex.Match(j, "\"" + k + "\":\"((?:[^\"\\\\]|\\\\.)*)\""); return m.Success ? Regex.Unescape(m.Groups[1].Value) : ""; }
  static int N(string j, string k) { var m = Regex.Match(j, "\"" + k + "\":(-?\\d+)"); return m.Success ? int.Parse(m.Groups[1].Value) : -1; }

  // Cari bingkai vertikal oranye (tombol Teknik Oda) di kepala profil; ambil yang paling kanan = tombol Compare.
  Rectangle FindAnchor(Rectangle win) {
    int w = win.Width, h = win.Height; if (w < 400 || h < 300) return Rectangle.Empty;
    using (var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(bmp)) { var dc = g.GetHdc(); try { PrintWindow(fm, dc, 2); } finally { g.ReleaseHdc(dc); } }
      int x0 = (int)(w * 0.12), x1 = (int)(w * 0.60), y0 = (int)(h * 0.14), y1 = (int)(h * 0.40);
      var bd = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      try {
        int stride = bd.Stride; var buf = new byte[stride * h]; Marshal.Copy(bd.Scan0, buf, 0, buf.Length);
        Func<int, int, bool> or = (x, y) => { int i = y * stride + x * 4; int b = buf[i], gg = buf[i + 1], r = buf[i + 2]; return r > 170 && gg > 85 && gg < 150 && b < 50; };
        Func<int, int, bool> dark = (x, y) => { int i = y * stride + x * 4; return buf[i] < 20 && buf[i + 1] < 20 && buf[i + 2] < 20; };
        int bestX = -1, bestT = 0, bestB = 0, minRun = Math.Max(14, h / 80);
        for (int x = x1; x >= x0; x--) {
          int run = 0, top = 0;
          for (int y = y0; y <= y1; y++) {
            if (or(x, y)) { if (run == 0) top = y; run++; }
            else { if (run >= minRun && run < h / 12 && x > 6 && dark(x - 4, top + run / 2)) { bestX = x; bestT = top; bestB = top + run; break; } run = 0; }
          }
          if (bestX >= 0) break;
        }
        if (bestX < 0) { if (DEBUG && (DateTime.Now - lastSnap).TotalSeconds > 8) { lastSnap = DateTime.Now; try { bmp.Save(Path.Combine(Path.GetDirectoryName(Application.ExecutablePath), "capa-snap.png")); Dbg("snap " + w + "x" + h); } catch { } } return Rectangle.Empty; }
        return new Rectangle(win.Left + bestX, win.Top + bestT - 2, 1, bestB - bestT + 4); // tepi kanan tombol Compare
      } finally { bmp.UnlockBits(bd); }
    }
  }
  void Tick(object o, EventArgs e) {
    var j = pending; pending = null;
    if (j != null) {
      found = j.Contains("\"found\":true"); var nm = found ? S(j, "name") : S(j, "ad"); int nca = N(j, "ca"), npa = N(j, "pa");
      var key = Regex.Match(j, "\"zaman\":(\\d+)").Groups[1].Value + "|" + nm; // zaman (ms) melebihi int32
      if (key != lastKey || nca != ca || npa != pa) { lastKey = key; name = nm; ca = nca; pa = npa; Invalidate(); }
    }
    if (fm == IntPtr.Zero || (DateTime.Now - lastFmScan).TotalSeconds > 3) {
      lastFmScan = DateTime.Now; fm = IntPtr.Zero;
      foreach (var p in Process.GetProcessesByName("fm")) { try { if ((p.MainWindowTitle ?? "").Contains("Football Manager")) { fm = p.MainWindowHandle; break; } } catch { } }
    }
    var fg = GetForegroundWindow();
    bool active = fm != IntPtr.Zero && !IsIconic(fm) && (fg == fm || fg == Handle);
    if (active && (DateTime.Now - lastCap).TotalMilliseconds > 650) {
      lastCap = DateTime.Now; RECT r;
      try { anchor = GetWindowRect(fm, out r) ? FindAnchor(Rectangle.FromLTRB(r.L, r.T, r.R, r.B)) : Rectangle.Empty; } catch (Exception ex) { anchor = Rectangle.Empty; Dbg("err " + ex.Message); }
      Dbg("anchor " + anchor + " found=" + found + " ca=" + ca + " name=" + name);
    }
    bool show = active && anchor.Height > 0 && found && ca >= 0 && hiddenKey != lastKey;
    if (show) {
      int hh = anchor.Height, ww = (int)(hh * 4.7); var loc = new Point(anchor.Right + (int)(hh * 0.28), anchor.Top);
      if (Size.Width != ww || Size.Height != hh) { Size = new Size(ww, hh); Shape(); Invalidate(); }
      if (Location != loc) Location = loc;
      if (!Visible) { Show(); TopMost = true; }
    } else if (Visible) Hide();
  }
  static DateTime lastSnap = DateTime.MinValue;
  static readonly bool DEBUG = Environment.GetCommandLineArgs().Length > 2 && Environment.GetCommandLineArgs()[2] == "debug";
  static void Dbg(string s) { if (!DEBUG) return; try { File.AppendAllText(Path.Combine(Path.GetDirectoryName(Application.ExecutablePath), "capa.log"), DateTime.Now.ToString("HH:mm:ss.fff ") + s + "\r\n"); } catch { } }
  void Shape() { using (var gp = Round(new Rectangle(0, 0, Width, Height), Math.Max(6, Height / 5))) Region = new Region(gp); }
  static GraphicsPath Round(Rectangle b, int r) { var gp = new GraphicsPath(); int d = r * 2; gp.AddArc(b.X, b.Y, d, d, 180, 90); gp.AddArc(b.Right - d, b.Y, d, d, 270, 90); gp.AddArc(b.Right - d, b.Bottom - d, d, d, 0, 90); gp.AddArc(b.X, b.Bottom - d, d, d, 90, 90); gp.CloseFigure(); return gp; }
  static Color Col(int v) { return v >= 170 ? Color.FromArgb(74, 222, 128) : v >= 140 ? Color.FromArgb(163, 230, 53) : v >= 110 ? Color.FromArgb(250, 204, 21) : v >= 80 ? Color.FromArgb(251, 146, 60) : Color.FromArgb(226, 232, 240); }
  protected override void OnPaint(PaintEventArgs e) {
    var g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias; g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;
    int H = Height, W = Width, r = Math.Max(6, H / 5);
    using (var gp = Round(new Rectangle(1, 1, W - 3, H - 3), r - 1)) using (var p = new Pen(ORANGE, Math.Max(1.5f, H / 24f))) g.DrawPath(p, gp);
    // ikon: kotak gelap + bola hijau
    int ic = (int)(H * 0.62), ix = (int)(H * 0.2), iy = (H - ic) / 2;
    using (var gp = Round(new Rectangle(ix, iy, ic, ic), Math.Max(3, ic / 5))) using (var b = new SolidBrush(Color.FromArgb(32, 36, 48))) g.FillPath(b, gp);
    using (var f = new Font("Segoe UI Black", ic * 0.42f, GraphicsUnit.Pixel)) using (var b = new SolidBrush(Color.FromArgb(74, 222, 128))) { var sz = g.MeasureString("CP", f); g.DrawString("CP", f, b, ix + (ic - sz.Width) / 2 + 1, iy + (ic - sz.Height) / 2 + 1); }
    float tx = ix + ic + H * 0.22f;
    using (var f = new Font("Segoe UI Semibold", H * 0.27f, GraphicsUnit.Pixel)) using (var b = new SolidBrush(ORANGE)) g.DrawString("ASISTEN FM27", f, b, tx, H * 0.06f);
    using (var lf = new Font("Segoe UI Semibold", H * 0.38f, GraphicsUnit.Pixel)) using (var vf = new Font("Segoe UI", H * 0.42f, FontStyle.Bold, GraphicsUnit.Pixel)) {
      float y = H * 0.36f, x = tx;
      Action<string, Font, Color> put = (s, f, c) => { using (var b = new SolidBrush(c)) { g.DrawString(s, f, b, x, y - (f == vf ? H * 0.03f : 0)); x += g.MeasureString(s, f, PointF.Empty, StringFormat.GenericTypographic).Width + H * 0.06f; } };
      put("CA", lf, Color.White); put(ca >= 0 ? ca.ToString() : "â€“", vf, Col(ca)); x += H * 0.12f;
      put("PA", lf, Color.White); put(pa >= 0 ? pa.ToString() : "â€“", vf, Col(pa));
    }
  }
  [STAThread] static void Main(string[] a) {
    try { SetProcessDPIAware(); } catch { }
    bool fresh; var mx = new Mutex(true, "AsistenFM27_capa", out fresh); if (!fresh) return;
    Application.EnableVisualStyles();
    Application.Run(new Capa(a.Length > 0 ? a[0] : "http://localhost:2728"));
    GC.KeepAlive(mx);
  }
}
