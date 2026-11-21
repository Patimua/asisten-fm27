// Setup Asisten FM27 — installer & uninstaller (satu exe, tanpa dependensi selain .NET Framework 4.x bawaan Windows).
//  • Memeriksa Node.js & Teknik Oda; bila belum ada → MENAWARKAN membuka halaman unduhannya (tidak memaksa).
//  • Memasang ke %LOCALAPPDATA%\Programs\Asisten FM27 (bisa diganti), shortcut Desktop + Start Menu, entri "Aplikasi" Windows.
//  • Pembaruan menjaga folder data (riwayat cheat, data per karier).
//  • Opsional: pengawas Teknik Oda (Startup) & plugin Jembatan (eksperimental, untuk "Terapkan ke FM").
//  • "Setup.exe /uninstall" = hapus pemasangan (data boleh disimpan).
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

static class Info
{
    public const string Name = "Asisten FM27";
    public const string Version = "27.1.14";
    public const string Launcher = "Asisten FM27 - FM 27.1.vbs";
    public const string Watcher = "Pengawas Teknik Oda.vbs";
    public const string UninstKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\AsistenFM27";
    public const string NodeUrl = "https://nodejs.org/id/download";
    // Halaman unduhan Teknik Oda: dibaca dari resource "teknikoda-url.txt" (mudah diganti saat build)
    public static string OdaUrl { get { var s = Res.Text("teknikoda-url.txt"); return string.IsNullOrEmpty(s) ? "https://www.google.com/search?q=Teknik+Oda+FM27" : s.Trim(); } }
    public static string DefaultDir { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", Name); } }
}

static class Res
{
    public static Stream Open(string name)
    {
        var asm = Assembly.GetExecutingAssembly();
        foreach (var n in asm.GetManifestResourceNames()) if (n.EndsWith(name, StringComparison.OrdinalIgnoreCase)) return asm.GetManifestResourceStream(n);
        return null;
    }
    public static string Text(string name) { var s = Open(name); if (s == null) return null; using (var r = new StreamReader(s, Encoding.UTF8)) return r.ReadToEnd(); }
}

static class Check
{
    public static string NodePath()
    {
        foreach (var d in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(';'))
        { try { var f = Path.Combine(d.Trim(), "node.exe"); if (File.Exists(f)) return f; } catch { } }
        foreach (var f in new[] { @"C:\Program Files\nodejs\node.exe", @"C:\Program Files (x86)\nodejs\node.exe", Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\nodejs\node.exe") })
            if (File.Exists(f)) return f;
        return null;
    }
    public static string OdaPath()
    {
        var f = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\Teknik Oda\TeknikOda.exe");
        if (File.Exists(f)) return f;
        foreach (var root in new[] { Registry.CurrentUser, Registry.LocalMachine })
        {
            try
            {
                using (var k = root.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall"))
                {
                    if (k == null) continue;
                    foreach (var sub in k.GetSubKeyNames())
                        using (var s = k.OpenSubKey(sub))
                        {
                            var name = s == null ? null : s.GetValue("DisplayName") as string;
                            if (name != null && name.IndexOf("Teknik Oda", StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                var loc = s.GetValue("InstallLocation") as string;
                                if (!string.IsNullOrEmpty(loc) && File.Exists(Path.Combine(loc, "TeknikOda.exe"))) return Path.Combine(loc, "TeknikOda.exe");
                                return loc ?? name;
                            }
                        }
                }
            }
            catch { }
        }
        return null;
    }
    public static bool FmRunning() { return Process.GetProcessesByName("fm").Length > 0; }
}

static class Shell
{
    static object sh;
    static object Sh() { if (sh == null) sh = Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell")); return sh; }
    public static void Link(string lnk, string target, string args, string workDir, string icon, string desc)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(lnk));
        var s = Sh().GetType().InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, Sh(), new object[] { lnk });
        var t = s.GetType();
        t.InvokeMember("TargetPath", BindingFlags.SetProperty, null, s, new object[] { target });
        t.InvokeMember("Arguments", BindingFlags.SetProperty, null, s, new object[] { args ?? "" });
        t.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, s, new object[] { workDir });
        if (icon != null) t.InvokeMember("IconLocation", BindingFlags.SetProperty, null, s, new object[] { icon });
        t.InvokeMember("Description", BindingFlags.SetProperty, null, s, new object[] { desc ?? "" });
        t.InvokeMember("Save", BindingFlags.InvokeMethod, null, s, null);
    }
    public static string Desktop { get { return Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory); } }
    public static string StartMenu { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), Info.Name); } }
    public static string Startup { get { return Environment.GetFolderPath(Environment.SpecialFolder.Startup); } }
    public static void Open(string url) { try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { } }
}

static class Installer
{
    // Hentikan Asisten yang sedang berjalan (server, badge CA/PA, pengawas) agar berkas bisa ditimpa
    public static void StopRunning(string dir)
    {
        try { var rq = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:2728/api/shutdown"); rq.Method = "POST"; rq.Timeout = 2500; rq.ContentLength = 0; rq.Proxy = null; using (rq.GetResponse()) { } } catch { }
        foreach (var n in new[] { "capa", "balon" }) foreach (var p in Process.GetProcessesByName(n)) { try { p.Kill(); } catch { } }
        try
        {
            var dl = dir.ToLowerInvariant();
            foreach (var p in Process.GetProcessesByName("wscript"))
                try { var cl = CommandLine(p.Id); if (cl != null && cl.ToLowerInvariant().Contains(dl)) p.Kill(); } catch { }
        }
        catch { }
        Thread.Sleep(800);
    }
    static string CommandLine(int pid)
    {
        try
        {
            using (var s = new System.Management.ManagementObjectSearcher("SELECT CommandLine FROM Win32_Process WHERE ProcessId=" + pid))
                foreach (System.Management.ManagementObject o in s.Get()) return o["CommandLine"] as string;
        }
        catch { }
        return null;
    }

    public static void Extract(string zipRes, string dir, Action<int> progress, bool skipData)
    {
        using (var st = Res.Open(zipRes))
        using (var z = new ZipArchive(st, ZipArchiveMode.Read))
        {
            int i = 0, n = z.Entries.Count;
            foreach (var e in z.Entries)
            {
                i++;
                var rel = e.FullName.Replace('/', '\\');
                if (skipData && rel.StartsWith("data\\", StringComparison.OrdinalIgnoreCase)) continue;
                var dst = Path.Combine(dir, rel);
                if (rel.EndsWith("\\")) { Directory.CreateDirectory(dst); continue; }
                Directory.CreateDirectory(Path.GetDirectoryName(dst));
                for (int t = 0; ; t++)
                {
                    try { e.ExtractToFile(dst, true); break; }
                    catch (IOException) { if (t >= 5) throw; Thread.Sleep(500); }
                }
                if (progress != null) progress(i * 100 / n);
            }
        }
    }

    public static long DirSizeKb(string dir) { long s = 0; try { foreach (var f in Directory.GetFiles(dir, "*", SearchOption.AllDirectories)) s += new FileInfo(f).Length; } catch { } return s / 1024; }

    public static void Register(string dir, string uninstaller)
    {
        using (var k = Registry.CurrentUser.CreateSubKey(Info.UninstKey))
        {
            k.SetValue("DisplayName", Info.Name);
            k.SetValue("DisplayVersion", Info.Version);
            k.SetValue("Publisher", "Asisten FM27");
            k.SetValue("InstallLocation", dir);
            k.SetValue("DisplayIcon", Path.Combine(dir, "asisten.ico"));
            k.SetValue("UninstallString", "\"" + uninstaller + "\" /uninstall");
            k.SetValue("NoModify", 1, RegistryValueKind.DWord);
            k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
            k.SetValue("EstimatedSize", (int)DirSizeKb(dir), RegistryValueKind.DWord);
            k.SetValue("InstallDate", DateTime.Now.ToString("yyyyMMdd"));
        }
    }

    public static string InstalledDir()
    {
        try { using (var k = Registry.CurrentUser.OpenSubKey(Info.UninstKey)) { var v = k == null ? null : k.GetValue("InstallLocation") as string; if (!string.IsNullOrEmpty(v)) return v; } } catch { }
        return null;
    }
    public static string InstalledVersion()
    {
        try { using (var k = Registry.CurrentUser.OpenSubKey(Info.UninstKey)) return k == null ? null : k.GetValue("DisplayVersion") as string; } catch { return null; }
    }
}

class SetupForm : Form
{
    TextBox dirBox, notes; CheckBox cDesk, cStart, cWatch, cPlugin, cRun; Button go, cancel, browse;
    Label lNode, lOda, lFm, status; ProgressBar bar; LinkLabel aNode, aOda;
    string nodeP, odaP;

    public SetupForm()
    {
        Text = "Pasang " + Info.Name + " v" + Info.Version;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
        Font = new Font("Segoe UI", 9.5f); FormBorderStyle = FormBorderStyle.FixedDialog; MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen; ClientSize = new Size(640, 640); BackColor = Color.White;

        var head = new Panel { Dock = DockStyle.Top, Height = 74, BackColor = Color.FromArgb(10, 20, 38) };
        head.Controls.Add(new Label { Text = Info.Name.ToUpper(), ForeColor = Color.White, Font = new Font("Segoe UI Black", 18f), AutoSize = true, Location = new Point(18, 10) });
        head.Controls.Add(new Label { Text = "v" + Info.Version + " · untuk Football Manager 27 (27.1) · scouting, latihan, analisis & cheat", ForeColor = Color.FromArgb(184, 242, 48), AutoSize = true, UseMnemonic = false, Location = new Point(21, 46) });
        Controls.Add(head);

        int y = 88;
        Controls.Add(new Label { Text = "PEMERIKSAAN", Font = new Font("Segoe UI Semibold", 9f), ForeColor = Color.Gray, Location = new Point(18, y), AutoSize = true }); y += 22;
        lNode = Row(ref y, out aNode, "Unduh Node.js", Info.NodeUrl);
        lOda = Row(ref y, out aOda, "Unduh Teknik Oda", Info.OdaUrl);
        lFm = new Label { Location = new Point(22, y), AutoSize = true }; Controls.Add(lFm); y += 30;

        Controls.Add(new Label { Text = "LOKASI PEMASANGAN", Font = new Font("Segoe UI Semibold", 9f), ForeColor = Color.Gray, Location = new Point(18, y), AutoSize = true }); y += 22;
        dirBox = new TextBox { Location = new Point(22, y), Width = 500, Text = Installer.InstalledDir() ?? Info.DefaultDir }; Controls.Add(dirBox);
        browse = new Button { Text = "Ubah…", Location = new Point(530, y - 1), Width = 90 }; Controls.Add(browse);
        browse.Click += (s, e) => { using (var d = new FolderBrowserDialog { SelectedPath = dirBox.Text }) if (d.ShowDialog(this) == DialogResult.OK) dirBox.Text = Path.Combine(d.SelectedPath, d.SelectedPath.EndsWith(Info.Name) ? "" : Info.Name).TrimEnd('\\'); };
        y += 36;

        cDesk = Box(ref y, "Shortcut di Desktop", true);
        cStart = Box(ref y, "Shortcut di Start Menu", true);
        cWatch = Box(ref y, "Buka Asisten otomatis setiap kali Teknik Oda dibuka (pengawas kecil di Startup Windows)", true);
        cPlugin = Box(ref y, "Pasang plugin Jembatan ke FM (eksperimental — untuk tombol \"Terapkan ke FM\" di Latihan)", false);
        cRun = Box(ref y, "Jalankan Asisten FM27 setelah selesai", true);
        y += 6;
        Controls.Add(new Label { Text = "APA YANG BARU", Font = new Font("Segoe UI Semibold", 9f), ForeColor = Color.Gray, Location = new Point(18, y), AutoSize = true }); y += 22;
        notes = new TextBox { Location = new Point(22, y), Size = new Size(598, 150), Multiline = true, ReadOnly = true, ScrollBars = ScrollBars.Vertical, BackColor = Color.FromArgb(246, 248, 251), Font = new Font("Consolas", 9f) };
        // Changelog tanpa simbol markdown (**, `, judul #)
        notes.Text = System.Text.RegularExpressions.Regex.Replace((Res.Text("CHANGELOG.md") ?? "").Replace("\r", ""), @"\*\*|`|^# .*\n\n?", "", System.Text.RegularExpressions.RegexOptions.Multiline).Replace("## ", "■ ").Replace("\n", "\r\n");
        Controls.Add(notes); y += 160;

        bar = new ProgressBar { Location = new Point(22, y), Width = 598, Height = 12, Visible = false }; Controls.Add(bar); y += 18;
        status = new Label { Location = new Point(22, y), AutoSize = true, ForeColor = Color.DimGray }; Controls.Add(status);
        go = new Button { Text = "Pasang", Location = new Point(424, 596), Size = new Size(96, 32), BackColor = Color.FromArgb(8, 149, 92), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
        cancel = new Button { Text = "Batal", Location = new Point(526, 596), Size = new Size(96, 32) };
        Controls.Add(go); Controls.Add(cancel); AcceptButton = go; CancelButton = cancel;
        cancel.Click += (s, e) => Close();
        go.Click += (s, e) => Install();
        var old = Installer.InstalledVersion();
        if (old != null) { go.Text = old == Info.Version ? "Pasang ulang" : "Perbarui"; status.Text = "Terpasang: v" + old + " — data Anda tetap aman saat diperbarui."; }
        Shown += (s, e) => RunChecks(true);
    }

    Label Row(ref int y, out LinkLabel link, string linkText, string url)
    {
        var l = new Label { Location = new Point(22, y), AutoSize = true }; Controls.Add(l);
        link = new LinkLabel { Text = linkText, Location = new Point(470, y), AutoSize = true, Visible = false }; Controls.Add(link);
        var u = url; link.LinkClicked += (s, e) => Shell.Open(u);
        y += 24; return l;
    }
    CheckBox Box(ref int y, string text, bool on) { var c = new CheckBox { Text = text, Checked = on, Location = new Point(22, y), Width = 600 }; Controls.Add(c); y += 26; return c; }

    void RunChecks(bool offer)
    {
        nodeP = Check.NodePath(); odaP = Check.OdaPath();
        lNode.Text = nodeP != null ? "✔  Node.js terpasang" : "✖  Node.js belum terpasang (wajib — menjalankan Asisten)";
        lNode.ForeColor = nodeP != null ? Color.SeaGreen : Color.Firebrick; aNode.Visible = nodeP == null;
        lOda.Text = odaP != null ? "✔  Teknik Oda terpasang" : "✖  Teknik Oda belum terpasang (wajib — sumber data pemain)";
        lOda.ForeColor = odaP != null ? Color.SeaGreen : Color.Firebrick; aOda.Visible = odaP == null;
        lFm.Text = Check.FmRunning() ? "ℹ  FM27 sedang terbuka — tidak apa-apa, Asisten bisa dipasang sekarang." : "ℹ  FM27 tidak perlu terbuka saat memasang.";
        if (!offer) return;
        if (odaP == null && MessageBox.Show(this, "Teknik Oda belum terdeteksi di komputer ini.\n\nAsisten FM27 membaca data pemain dari Teknik Oda, jadi Teknik Oda perlu dipasang.\n\nBuka halaman unduhan Teknik Oda sekarang?\n(Anda tetap bisa melanjutkan memasang Asisten.)", "Teknik Oda belum ada", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
            Shell.Open(Info.OdaUrl);
        if (nodeP == null && MessageBox.Show(this, "Node.js belum terdeteksi.\n\nAsisten FM27 berjalan memakai Node.js (gratis).\n\nBuka halaman unduhan Node.js sekarang? Pilih versi LTS, pasang, lalu lanjutkan di sini.", "Node.js belum ada", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
            Shell.Open(Info.NodeUrl);
    }

    void Install()
    {
        var dir = dirBox.Text.Trim().TrimEnd('\\');
        if (dir.Length < 4) { MessageBox.Show(this, "Lokasi pemasangan tidak valid."); return; }
        RunChecks(false);
        if (nodeP == null && MessageBox.Show(this, "Node.js belum terpasang, jadi Asisten belum bisa berjalan setelah dipasang.\n\nTetap pasang sekarang? (Pasang Node.js kemudian, lalu buka Asisten dari shortcut.)", "Lanjutkan?", MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes) return;
        foreach (Control c in Controls) if (c is Button || c is CheckBox || c is TextBox) c.Enabled = false;
        notes.Enabled = true; bar.Visible = true; bar.Value = 0;
        var o = new { desk = cDesk.Checked, start = cStart.Checked, watch = cWatch.Checked, plugin = cPlugin.Checked, run = cRun.Checked };
        var th = new Thread(() =>
        {
            string err = null;
            try
            {
                Say("Menghentikan Asisten yang sedang berjalan…"); Installer.StopRunning(dir);
                Directory.CreateDirectory(dir); Directory.CreateDirectory(Path.Combine(dir, "data"));
                Say("Menyalin berkas aplikasi…"); Installer.Extract("app.zip", dir, p => Prog(p), true);
                if (o.plugin) { Say("Menyiapkan plugin Jembatan…"); Installer.Extract("jembatan.zip", Path.Combine(dir, "native", "jembatan"), null, false); }
                var un = Path.Combine(dir, "Uninstall Asisten FM27.exe");
                try { if (!string.Equals(Application.ExecutablePath, un, StringComparison.OrdinalIgnoreCase)) File.Copy(Application.ExecutablePath, un, true); } catch { }
                Say("Membuat shortcut…");
                var lnchArgs = "\"" + Path.Combine(dir, Info.Launcher) + "\""; var ico = Path.Combine(dir, "asisten.ico"); var desc = "Asisten FM27 — scouting, latihan, analisis & cheat untuk Football Manager 27";
                var oldDesk = Path.Combine(Shell.Desktop, "Asisten FM27 (FM 27.1).lnk");
                if (o.desk) Shell.Link(oldDesk, "wscript.exe", lnchArgs, dir, ico, desc);
                if (o.start)
                {
                    Shell.Link(Path.Combine(Shell.StartMenu, "Asisten FM27.lnk"), "wscript.exe", lnchArgs, dir, ico, desc);
                    Shell.Link(Path.Combine(Shell.StartMenu, "Uninstall Asisten FM27.lnk"), un, "/uninstall", dir, ico, "Hapus Asisten FM27");
                }
                var wl = Path.Combine(Shell.Startup, "Pengawas Teknik Oda (Asisten FM27).lnk");
                if (o.watch) { Shell.Link(wl, "wscript.exe", "\"" + Path.Combine(dir, Info.Watcher) + "\"", dir, null, "Buka Asisten FM27 saat Teknik Oda dibuka"); Process.Start("wscript.exe", "\"" + Path.Combine(dir, Info.Watcher) + "\""); }
                else if (File.Exists(wl)) File.Delete(wl);
                Installer.Register(dir, un);
                Prog(100); Say("Selesai.");
            }
            catch (Exception ex) { err = ex.Message; }
            Invoke((Action)(() =>
            {
                if (err != null) { MessageBox.Show(this, "Pemasangan gagal:\n\n" + err + "\n\nTutup Asisten/FM bila berkasnya sedang dipakai, lalu coba lagi.", "Gagal", MessageBoxButtons.OK, MessageBoxIcon.Error); Close(); return; }
                var msg = "Asisten FM27 v" + Info.Version + " sudah terpasang di:\n" + dir + "\n\nCara pakai: buka FM27, muat save, lalu buka \"Asisten FM27\" dari Desktop/Start Menu.";
                if (odaP == null) msg += "\n\n⚠ Jangan lupa memasang Teknik Oda — tanpa itu daftar pemain kosong.";
                if (nodeP == null) msg += "\n\n⚠ Pasang Node.js (LTS) dulu sebelum membuka Asisten.";
                if (o.plugin) msg += "\n\nPlugin Jembatan akan dipasang otomatis ke folder FM saat Asisten berjalan dan FM ditutup sekali.";
                MessageBox.Show(this, msg, "Selesai", MessageBoxButtons.OK, MessageBoxIcon.Information);
                if (o.run && nodeP != null) Process.Start("wscript.exe", "\"" + Path.Combine(dir, Info.Launcher) + "\"");
                Close();
            }));
        }) { IsBackground = true };
        th.Start();
    }
    void Say(string t) { Invoke((Action)(() => status.Text = t)); }
    void Prog(int p) { Invoke((Action)(() => bar.Value = Math.Max(0, Math.Min(100, p)))); }
}

static class Uninstall
{
    public static void Run(string[] args)
    {
        var dir = Installer.InstalledDir() ?? Path.GetDirectoryName(Application.ExecutablePath);
        // Tahap 2: dijalankan dari salinan di TEMP supaya folder pemasangan bisa dihapus
        if (args.Length >= 3 && args[0] == "/uninstall2") { Remove(args[1], args[2] == "1"); return; }
        if (MessageBox.Show("Hapus " + Info.Name + " dari komputer ini?\n\nLokasi: " + dir, "Uninstall " + Info.Name, MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
        var keep = MessageBox.Show("Simpan data Anda (riwayat cheat, target transfer, daftar pantau, pengaturan latihan per karier)?\n\nYa = simpan (berguna bila nanti dipasang lagi)\nTidak = hapus semuanya", "Data", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes;
        var tmp = Path.Combine(Path.GetTempPath(), "AsistenFM27-uninstall.exe");
        File.Copy(Application.ExecutablePath, tmp, true);
        Process.Start(tmp, "/uninstall2 \"" + dir + "\" " + (keep ? "1" : "0"));
    }
    static void Remove(string dir, bool keepData)
    {
        Thread.Sleep(800);
        Installer.StopRunning(dir);
        foreach (var f in new[] { Path.Combine(Shell.Desktop, "Asisten FM27 (FM 27.1).lnk"), Path.Combine(Shell.Startup, "Pengawas Teknik Oda (Asisten FM27).lnk") }) { try { if (File.Exists(f)) File.Delete(f); } catch { } }
        try { if (Directory.Exists(Shell.StartMenu)) Directory.Delete(Shell.StartMenu, true); } catch { }
        try { Registry.CurrentUser.DeleteSubKeyTree(Info.UninstKey, false); } catch { }
        // Plugin Jembatan di folder FM (bila pernah dipasang)
        try { var fmdir = File.ReadAllText(Path.Combine(dir, @"data\fm-dir.json")); var m = System.Text.RegularExpressions.Regex.Match(fmdir, "\"dir\"\\s*:\\s*\"([^\"]+)\""); if (m.Success) { var pd = Path.Combine(m.Groups[1].Value.Replace("\\\\", "\\"), @"BepInEx\plugins\AsistenFM27"); if (Directory.Exists(pd)) Directory.Delete(pd, true); } } catch { }
        try
        {
            if (Directory.Exists(dir))
            {
                foreach (var f in Directory.GetFiles(dir)) { try { File.Delete(f); } catch { } }
                foreach (var d in Directory.GetDirectories(dir))
                {
                    if (keepData && Path.GetFileName(d).Equals("data", StringComparison.OrdinalIgnoreCase)) continue;
                    try { Directory.Delete(d, true); } catch { }
                }
                if (!keepData) { try { Directory.Delete(dir, true); } catch { } }
            }
        }
        catch { }
        MessageBox.Show(Info.Name + " sudah dihapus." + (keepData ? "\n\nData Anda disimpan di:\n" + Path.Combine(dir, "data") : ""), "Uninstall selesai", MessageBoxButtons.OK, MessageBoxIcon.Information);
        // hapus salinan TEMP ini sendiri
        try { Process.Start(new ProcessStartInfo("cmd.exe", "/c ping 127.0.0.1 -n 3 >nul & del \"" + Application.ExecutablePath + "\"") { CreateNoWindow = true, UseShellExecute = false }); } catch { }
    }
}

static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        if (args.Length > 0 && (args[0] == "/uninstall" || args[0] == "/uninstall2")) { Uninstall.Run(args); return; }
        // Uji tanpa efek samping: ekstrak isi installer ke folder tertentu (tanpa shortcut/registry/menghentikan Asisten)
        if (args.Length > 1 && args[0] == "/selftest")
        {
            try { Installer.Extract("app.zip", args[1], null, true); Installer.Extract("jembatan.zip", Path.Combine(args[1], "native", "jembatan"), null, false); File.WriteAllText(Path.Combine(args[1], "selftest.txt"), "ok " + Info.Version + " oda=" + (Check.OdaPath() ?? "-") + " node=" + (Check.NodePath() ?? "-") + " odaurl=" + Info.OdaUrl); }
            catch (Exception e) { File.WriteAllText(Path.Combine(args[1], "selftest.txt"), "gagal " + e); }
            return;
        }
        Application.Run(new SetupForm());
    }
}
