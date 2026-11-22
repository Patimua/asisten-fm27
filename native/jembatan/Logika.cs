// Asisten FM27 — Jembatan · LOGIKA (dimuat ulang otomatis oleh inti tanpa menutup FM)
// • Perekam: setiap event tampilan → mesin dicatat lengkap (referensi + data bersarang) ke event.log.
// • Cetakan: event terakhir per jenis disimpan (referensi + salinan data) supaya bisa diputar ulang.
// • Pelaksana: membaca perintah.txt (ditulis Asisten), menjalankan, menulis hasil ke hasil.txt.
//   Format baris:  ping
//                  dump <eventID>
//                  replay <eventID> [pers=<id internal>] [set=<kunci>[/<kunci>]:<s|b|i|n>:<nilai>;...]
//   s = teks, b = true/false, i = bilangan bulat, n = DynamicNumber. pers = 0x01000000 + dbi pemain (lihat Asisten).
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using FM.GamePlugin;
using SI.Interop;
using SI.Core;

public static class Logika
{
    public static string Versi = "1.3";
    const uint PERS = 1348825715; // kode tipe "Pers" di referensi
    const uint GUID = 1198877028; // kode sesi game (berubah tiap save dimuat)
    static int lastGuid = -1;
    static string Dir { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AsistenFM27", "jembatan"); } }
    class Tpl { public string Ident; public TypedValue Data; public string Name; public int Guid; }
    static readonly Dictionary<uint, Tpl> tpl = new Dictionary<uint, Tpl>();
    static int count;
    static bool replaying;

    // ---------------- Perekam ----------------
    public static void OnEvent(uint id, InteropReference r, TypedValue d)
    {
        try
        {
            string name; try { name = ((InteropEventIDs)id).ToString(); } catch { name = id.ToString(); }
            string ident = Ident(r);
            int g; if (r != null && r.TryGetValue(GUID, out g)) lastGuid = g;
            TypedValue copy = null; try { copy = d == null ? null : TypedValue.CreateCopyFrom(d); } catch { }
            if (!replaying) tpl[id] = new Tpl { Ident = ident, Data = copy, Name = name, Guid = lastGuid };
            if (count++ > 30000) return;
            var sb = new StringBuilder();
            sb.Append(System.DateTime.Now.ToString("HH:mm:ss.fff")).Append('\t').Append(id).Append('\t').Append(name).Append(replaying ? "\t[ASISTEN]" : "").Append("\tke=").Append(ident).Append("\tdata=");
            Dump(d, 0, sb);
            sb.Append('\n');
            File.AppendAllText(Path.Combine(Dir, "event.log"), sb.ToString());
        }
        catch { }
    }

    static string Ident(InteropReference r)
    {
        if (r == null) return "null";
        try { return r.GetPersistentIdentity(); } catch { return "?"; }
    }

    static void Dump(TypedValue v, int depth, StringBuilder sb)
    {
        if (v == null) { sb.Append("null"); return; }
        string t = "?"; try { var dt = v.DataType; t = dt != null ? dt.Name : "?"; } catch { }
        Il2CppSystem.Object o = null; try { o = v.Get(); } catch { }
        try
        {
            var ir = o == null ? null : o.TryCast<InteropReference>();
            if (ir != null) { sb.Append("ref(").Append(Ident(ir)).Append(')'); return; }
            var rec = o == null ? null : o.TryCast<Record>();
            if (rec != null)
            {
                sb.Append(t).Append('{');
                if (depth > 4) { sb.Append("…}"); return; }
                var e = rec.Keys.GetEnumerator(); int n = 0;
                while (e.MoveNext() && n++ < 300)
                {
                    uint k = e.Current; sb.Append(k).Append('=');
                    try { Dump(rec[k], depth + 1, sb); } catch { sb.Append('?'); }
                    sb.Append("; ");
                }
                sb.Append('}'); return;
            }
            var list = o == null ? null : o.TryCast<Il2CppSystem.Collections.Generic.List<TypedValue>>();
            if (list != null)
            {
                sb.Append("list[");
                for (int i = 0; i < list.Count && i < 100; i++) { if (i > 0) sb.Append(", "); try { Dump(list[i], depth + 1, sb); } catch { sb.Append('?'); } }
                sb.Append(']'); return;
            }
        }
        catch { }
        string s = "?"; try { s = v.AsString(); } catch { }
        sb.Append(t).Append(':').Append(s);
    }

    // ---------------- Pelaksana perintah ----------------
    public static void Tick(GameInteropSubsystem sub)
    {
        string f = Path.Combine(Dir, "perintah.txt");
        if (!File.Exists(f)) return;
        string[] lines; try { lines = File.ReadAllLines(f); File.Delete(f); } catch { return; }
        var res = new StringBuilder();
        foreach (var raw in lines)
        {
            var line = raw.Trim(); if (line.Length == 0 || line.StartsWith("#")) continue;
            try { var hasil = Jalankan(sub, line); res.Append("OK ").Append(hasil).Append('\n'); }
            catch (Exception e) { res.Append("GAGAL ").Append(line).Append(" :: ").Append(e.GetType().Name).Append(": ").Append(e.Message).Append('\n'); }
        }
        File.AppendAllText(Path.Combine(Dir, "hasil.txt"), System.DateTime.Now.ToString("s") + "\n" + res.ToString());
    }

    static string Jalankan(GameInteropSubsystem sub, string line)
    {
        var parts = line.Split(new[] { ' ' }, 3);
        string op = parts[0];
        if (op == "ping") return "ping versi " + Versi + " · cetakan: " + tpl.Count + " · sesi " + lastGuid;
        uint id = uint.Parse(parts[1]);
        if (op == "punya") { Tpl q; return "punya " + id + " " + (!tpl.TryGetValue(id, out q) ? "tidak" : q.Guid == lastGuid ? "ya" : "lain"); } // cek cetakan tanpa melempar galat
        Tpl t; if (!tpl.TryGetValue(id, out t)) throw new Exception("belum ada cetakan untuk event " + id + " — lakukan sekali secara manual di FM");
        if (t.Guid != lastGuid) throw new Exception("cetakan dari save/sesi lain — belum ada cetakan untuk event " + id + " di save ini; lakukan sekali secara manual di FM");
        if (op == "dump") { var sb = new StringBuilder(); Dump(t.Data, 0, sb); return t.Name + " ke=" + t.Ident + " data=" + sb; }
        if (op != "replay") throw new Exception("perintah tidak dikenal: " + op);
        int pers = -1; string sets = "";
        if (parts.Length > 2)
            foreach (var kv in parts[2].Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries))
            {
                if (kv.StartsWith("pers=")) pers = int.Parse(kv.Substring(5));
                else if (kv.StartsWith("set=")) sets = kv.Substring(4);
            }
        // set= boleh berisi spasi di nilai teks: ambil sisa baris setelah "set="
        int si = line.IndexOf(" set="); if (si >= 0) sets = line.Substring(si + 5);
        var r = BuatRef(t.Ident, pers);
        var data = t.Data;
        if (data != null)
        {
            Il2CppSystem.Object o = data.Get();
            var rec = o == null ? null : o.TryCast<Record>();
            if (rec != null)
            {
                if (pers >= 0) GantiPers(rec, pers, 0);
                foreach (var s in sets.Split(new[] { ';' }, StringSplitOptions.RemoveEmptyEntries)) Atur(rec, s);
            }
        }
        replaying = true;
        try { sub.SendEvent(id, r, data); } finally { replaying = false; }
        return "replay " + t.Name + " pers=" + pers + " set=" + sets;
    }

    static InteropReference BuatRef(string ident, int pers)
    {
        var r = new InteropReference();
        foreach (var p in ident.Split(','))
        {
            var kv = p.Split(':'); if (kv.Length != 2) continue;
            uint k = uint.Parse(kv[0]); int v = int.Parse(kv[1]);
            r.SetValue(k, k == PERS && pers >= 0 ? pers : v);
        }
        return r;
    }

    static void GantiPers(Record rec, int pers, int depth)
    {
        if (depth > 5) return;
        var keys = new List<uint>(); var e = rec.Keys.GetEnumerator(); while (e.MoveNext()) keys.Add(e.Current);
        foreach (var k in keys)
        {
            TypedValue v = rec[k]; if (v == null) continue;
            Il2CppSystem.Object o = null; try { o = v.Get(); } catch { }
            if (o == null) continue;
            var ir = o.TryCast<InteropReference>();
            if (ir != null) { int old; if (ir.TryGetValue(PERS, out old)) v.SetValue(BuatRef(ir.GetPersistentIdentity(), pers)); continue; }
            var sub = o.TryCast<Record>();
            if (sub != null) GantiPers(sub, pers, depth + 1);
        }
    }

    static void Atur(Record rec, string spec)
    {
        // <kunci>[/<kunci>]:<tipe>:<nilai>
        int a = spec.IndexOf(':'), b = spec.IndexOf(':', a + 1);
        string path = spec.Substring(0, a), typ = spec.Substring(a + 1, b - a - 1), val = spec.Substring(b + 1);
        var keys = path.Split('/');
        Record cur = rec;
        for (int i = 0; i < keys.Length - 1; i++) cur = cur[uint.Parse(keys[i])].Get().TryCast<Record>();
        uint key = uint.Parse(keys[keys.Length - 1]);
        if (typ == "s") cur[key] = TypedValue.Create(val);
        else if (typ == "b") cur[key] = TypedValue.Create(val == "true" || val == "1");
        else if (typ == "i") cur[key] = TypedValue.Create(int.Parse(val));
        else if (typ == "n") { var dn = new DynamicNumber(); dn.Set(int.Parse(val)); cur[key].SetValue(dn.BoxIl2CppObject()); }
        else throw new Exception("tipe tidak dikenal " + typ);
    }
}
