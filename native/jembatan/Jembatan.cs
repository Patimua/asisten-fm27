// Asisten FM27 — Jembatan (plugin BepInEx untuk FM27) · INTI v0.2
// Tugas inti dibuat sekecil mungkin supaya jarang perlu diganti (mengganti inti = FM harus ditutup-buka):
//  1. Memasang kait (Harmony) pada FM.GamePlugin.GameInteropSubsystem.SendEvent — pintu resmi tampilan FM → mesin game —
//     lalu meneruskan setiap event ke LOGIKA.
//  2. Setiap ±0,5 dtk (di thread utama, menumpang GameInteropSubsystem.Tick) memuat ulang LOGIKA bila berkasnya berubah, lalu memanggil Logika.Tick(subsystem).
// LOGIKA (Asisten.Jembatan.Logika.dll di %LOCALAPPDATA%\AsistenFM27\jembatan) berisi perekam & pelaksana perintah dari Asisten,
// dan bisa diperbarui kapan saja tanpa menutup FM.
using System;
using System.IO;
using System.Reflection;
using BepInEx;
using BepInEx.Unity.IL2CPP;
using HarmonyLib;
using FM.GamePlugin;
using SI.Interop;
using SI.Core;

[BepInPlugin("asisten.fm27.jembatan", "Asisten FM27 Jembatan", "0.2.0")]
public class JembatanPlugin : BasePlugin
{
    public static string Dir;
    public static BepInEx.Logging.ManualLogSource L;
    public static GameInteropSubsystem Sub;
    static MethodInfo onEvent, tick;
    static System.DateTime logicTime = System.DateTime.MinValue;
    static string logicStatus = "belum dimuat";

    public override void Load()
    {
        L = Log;
        Dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AsistenFM27", "jembatan");
        Directory.CreateDirectory(Dir);
        try
        {
            var h = new Harmony("asisten.fm27.jembatan");
            h.PatchAll(typeof(KaitEvent));
            h.PatchAll(typeof(KaitTick));
            Status("aktif");
            L.LogInfo("Jembatan Asisten v0.2 aktif (inti). Logika dimuat dari " + Dir);
        }
        catch (Exception e) { Status("gagal " + e); L.LogError("Jembatan gagal: " + e); }
    }

    public static void Status(string s)
    {
        try { File.WriteAllText(Path.Combine(Dir, "status.txt"), s + " " + System.DateTime.Now.ToString("s") + "\ninti 0.2.0\nlogika: " + logicStatus); } catch { }
    }

    // Muat ulang logika bila berkasnya berubah (dimuat dari bytes, jadi berkas tidak terkunci)
    public static void CekLogika()
    {
        try
        {
            string f = Path.Combine(Dir, "Asisten.Jembatan.Logika.dll");
            if (!File.Exists(f)) return;
            var t = File.GetLastWriteTimeUtc(f);
            if (t == logicTime) return;
            logicTime = t;
            var asm = Assembly.Load(File.ReadAllBytes(f));
            var ty = asm.GetType("Logika");
            onEvent = ty.GetMethod("OnEvent", BindingFlags.Public | BindingFlags.Static);
            tick = ty.GetMethod("Tick", BindingFlags.Public | BindingFlags.Static);
            var ver = ty.GetField("Versi", BindingFlags.Public | BindingFlags.Static);
            logicStatus = "versi " + (ver != null ? ver.GetValue(null) : "?") + " dimuat " + System.DateTime.Now.ToString("s");
            Status("aktif");
            L.LogInfo("Logika Jembatan dimuat: " + logicStatus);
        }
        catch (Exception e) { logicStatus = "gagal memuat: " + e.Message; Status("aktif"); }
    }

    public static void Teruskan(uint id, InteropReference r, TypedValue d)
    {
        var m = onEvent; if (m == null) return;
        try { m.Invoke(null, new object[] { id, r, d }); } catch { }
    }

    public static void Detak()
    {
        CekLogika();
        var m = tick; if (m == null || Sub == null) return;
        try { m.Invoke(null, new object[] { Sub }); } catch (Exception e) { try { File.AppendAllText(Path.Combine(Dir, "error.log"), System.DateTime.Now.ToString("s") + " " + e + "\n"); } catch { } }
    }
}

// Detak di thread utama: menumpang GameInteropSubsystem.Tick() (dipanggil FM tiap frame), dibatasi ±0,5 dtk
[HarmonyPatch(typeof(GameInteropSubsystem), "Tick")]
public static class KaitTick
{
    static int last;
    static void Postfix(GameInteropSubsystem __instance)
    {
        JembatanPlugin.Sub = __instance;
        int now = Environment.TickCount;
        if (now - last < 500 && now >= last) return;
        last = now;
        JembatanPlugin.Detak();
    }
}

[HarmonyPatch(typeof(GameInteropSubsystem), "SendEvent")]
public static class KaitEvent
{
    static void Prefix(GameInteropSubsystem __instance, uint eventID, InteropReference objectTo, TypedValue data)
    {
        JembatanPlugin.Sub = __instance;
        JembatanPlugin.Teruskan(eventID, objectTo, data);
    }
}
