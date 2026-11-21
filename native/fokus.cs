// fokus — membawa jendela Football Manager ke depan (dipakai setelah "Buka di FM" dari Asisten).
// Windows hanya mengizinkan program latar memindah fokus bila ada input keyboard; maka ditekan-lepas tombol ALT dulu.
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

class Fokus
{
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] static extern bool BringWindowToTop(IntPtr h);
    [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();

    static int Main(string[] args)
    {
        int delay = args.Length > 0 ? int.Parse(args[0]) : 0;
        if (delay > 0) Thread.Sleep(delay);
        IntPtr h = IntPtr.Zero;
        foreach (var p in Process.GetProcessesByName("fm"))
        {
            try { if (p.MainWindowHandle != IntPtr.Zero && (p.MainWindowTitle ?? "").Contains("Football Manager")) { h = p.MainWindowHandle; break; } } catch { }
        }
        if (h == IntPtr.Zero) return 1;
        if (IsIconic(h)) ShowWindow(h, 9); // SW_RESTORE
        for (int i = 0; i < 3 && GetForegroundWindow() != h; i++)
        {
            keybd_event(0x12, 0, 0, UIntPtr.Zero); keybd_event(0x12, 0, 2, UIntPtr.Zero); // ALT turun-naik
            BringWindowToTop(h); SetForegroundWindow(h);
            Thread.Sleep(80);
        }
        return GetForegroundWindow() == h ? 0 : 2;
    }
}
