' Asisten FM27 (untuk FM 27.1) — peluncur:
' menyalakan server lokal (tersembunyi), membuka Teknik Oda bila belum jalan, lalu membuka jendela aplikasi.
' Semua program dijalankan lewat Windows (WMI) supaya berdiri sendiri: tidak ikut tertutup bila program
' yang memanggil peluncur ini (mis. jendela lain) ditutup.
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir
url = "http://localhost:2728"
Set wmi = GetObject("winmgmts:\\.\root\cimv2")
Set proc = wmi.Get("Win32_Process")
Set startup = wmi.Get("Win32_ProcessStartup").SpawnInstance_
startup.ShowWindow = 0

Sub Jalankan(cmd, folder, tampil)
  Dim pid
  If tampil Then startup.ShowWindow = 1 Else startup.ShowWindow = 0
  proc.Create cmd, folder, startup, pid
End Sub

If Not fso.FolderExists(dir & "\data") Then fso.CreateFolder(dir & "\data")

' Hentikan server versi lama (jika ada) supaya kode terbaru yang berjalan
On Error Resume Next
Set x = CreateObject("MSXML2.XMLHTTP")
x.Open "POST", url & "/api/shutdown", False
x.Send
On Error GoTo 0
WScript.Sleep 500

' Nyalakan server (keluaran dicatat ke data\server.log)
Jalankan "cmd.exe /c node --max-old-space-size=6144 """ & dir & "\server.js"" >> """ & dir & "\data\server.log"" 2>&1", dir, False

' Buka Teknik Oda bila belum berjalan (penanda dicatat supaya pengawas tidak membuka Asisten dua kali)
oda = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\Teknik Oda\TeknikOda.exe"
If fso.FileExists(oda) And wmi.ExecQuery("SELECT ProcessId FROM Win32_Process WHERE Name='TeknikOda.exe'").Count = 0 Then
  Set f = fso.CreateTextFile(dir & "\data\oda-dibuka-asisten.txt", True): f.Write CStr(Now): f.Close
  Jalankan """" & oda & """", fso.GetParentFolderName(oda), True
End If

' Pastikan pengawas Teknik Oda berjalan (hanya satu)
peng = dir & "\Pengawas Teknik Oda.vbs"
If fso.FileExists(peng) Then
  ada = False
  For Each p In wmi.ExecQuery("SELECT CommandLine FROM Win32_Process WHERE Name='wscript.exe'")
    If Not IsNull(p.CommandLine) Then
      If InStr(1, p.CommandLine, "Pengawas Teknik Oda", 1) > 0 Then ada = True
    End If
  Next
  If Not ada Then Jalankan "wscript.exe """ & peng & """", dir, False
End If
WScript.Sleep 1500

' Jendela aplikasi memakai profil Edge khusus (data\jendela): jendela versi lama ditutup dulu
' tanpa menyentuh Edge biasa Anda.
prof = dir & "\data\jendela"
For Each p In wmi.ExecQuery("SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name='msedge.exe'")
  If Not IsNull(p.CommandLine) Then
    If InStr(1, p.CommandLine, prof, 1) > 0 Then
      On Error Resume Next: p.Terminate: On Error GoTo 0
    End If
  End If
Next
WScript.Sleep 400

edge = sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe"
If Not fso.FileExists(edge) Then edge = sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe"
If fso.FileExists(edge) Then
  Jalankan """" & edge & """ --app=" & url & " --user-data-dir=""" & prof & """ --no-first-run --disable-features=Translate,TranslateUI --window-size=1480,940", fso.GetParentFolderName(edge), True
Else
  sh.Run url, 1, False
End If
