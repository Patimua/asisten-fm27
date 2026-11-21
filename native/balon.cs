// balon — notifikasi kecil di pojok kanan bawah jendela Football Manager 27 (selalu di atas, tidak mencuri fokus).
// Pakai: balon.exe "<judul>" "<teks>" [detik=12] [url-saat-diklik]
using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Windows.Forms;

class Balon : Form {
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [StructLayout(LayoutKind.Sequential)] struct RECT { public int L, T, R, B; }
  const int W = 380, H = 112;
  string judul, teks, url; int detik; Timer t; int umur = 0; bool hover;

  protected override bool ShowWithoutActivation { get { return true; } }
  protected override CreateParams CreateParams { get { var c = base.CreateParams; c.ExStyle |= 0x08000000 | 0x00000080 | 0x00000008; return c; } } // NOACTIVATE | TOOLWINDOW | TOPMOST

  Balon(string j, string x, int d, string u) {
    judul = j; teks = x; detik = d; url = u;
    FormBorderStyle = FormBorderStyle.None; ShowInTaskbar = false; TopMost = true; StartPosition = FormStartPosition.Manual;
    Size = new Size(W, H); BackColor = Color.FromArgb(16, 22, 35); DoubleBuffered = true; Opacity = 0;
    Rectangle area = Screen.PrimaryScreen.WorkingArea;
    foreach (var p in Process.GetProcessesByName("fm")) {
      try { if ((p.MainWindowTitle ?? "").Contains("Football Manager") && !IsIconic(p.MainWindowHandle)) { RECT r; if (GetWindowRect(p.MainWindowHandle, out r)) area = Rectangle.FromLTRB(r.L, r.T, r.R, r.B); break; } } catch { }
    }
    Location = new Point(area.Right - W - 24, area.Bottom - H - 28);
    using (var gp = new GraphicsPath()) { int rr = 14; gp.AddArc(0, 0, rr, rr, 180, 90); gp.AddArc(W - rr, 0, rr, rr, 270, 90); gp.AddArc(W - rr, H - rr, rr, rr, 0, 90); gp.AddArc(0, H - rr, rr, rr, 90, 90); gp.CloseFigure(); Region = new Region(gp); }
    Cursor = Cursors.Hand;
    MouseEnter += (s, e) => hover = true; MouseLeave += (s, e) => hover = false;
    Click += (s, e) => { try { if (!string.IsNullOrEmpty(url)) Process.Start(url); } catch { } Close(); };
    t = new Timer { Interval = 40 }; t.Tick += Tick; t.Start();
  }
  void Tick(object s, EventArgs e) {
    umur += 40;
    if (umur < 300) Opacity = umur / 300.0;
    else if (hover) { Opacity = 1; umur = Math.Min(umur, detik * 1000); }
    else if (umur > detik * 1000) { Opacity -= 0.06; if (Opacity <= 0.02) Close(); }
  }
  protected override void OnPaint(PaintEventArgs e) {
    var g = e.Graphics; g.SmoothingMode = SmoothingMode.AntiAlias; g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;
    using (var br = new LinearGradientBrush(new Rectangle(0, 0, 6, H), Color.FromArgb(34, 197, 94), Color.FromArgb(163, 230, 53), 90f)) g.FillRectangle(br, 0, 0, 6, H);
    using (var f = new Font("Segoe UI Emoji", 22f)) TextRenderer.DrawText(g, "⚽", f, new Point(16, 14), Color.White);
    using (var f = new Font("Segoe UI Semibold", 11.5f)) TextRenderer.DrawText(g, judul, f, new Rectangle(64, 12, W - 76, 26), Color.White, TextFormatFlags.EndEllipsis);
    using (var f = new Font("Segoe UI", 9.5f)) TextRenderer.DrawText(g, teks, f, new Rectangle(64, 38, W - 76, H - 46), Color.FromArgb(190, 200, 215), TextFormatFlags.WordBreak | TextFormatFlags.EndEllipsis);
    using (var f = new Font("Segoe UI", 8f)) TextRenderer.DrawText(g, "Asisten FM27 · klik untuk membuka", f, new Point(64, H - 20), Color.FromArgb(120, 135, 160));
    using (var p = new Pen(Color.FromArgb(50, 65, 95))) g.DrawRectangle(p, 0, 0, W - 1, H - 1);
  }
  [STAThread] static void Main(string[] a) {
    Application.EnableVisualStyles();
    Application.Run(new Balon(a.Length > 0 ? a[0] : "Asisten FM27", a.Length > 1 ? a[1] : "", a.Length > 2 ? int.Parse(a[2]) : 12, a.Length > 3 ? a[3] : ""));
  }
}
