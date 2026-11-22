' Pengawas kecil: setiap kali Teknik Oda dibuka, Asisten FM27 ikut dibuka.
' Dijalankan otomatis saat Windows menyala (shortcut di folder Startup). Hampir tidak memakai CPU:
' Windows sendiri yang memberi tahu saat TeknikOda.exe mulai berjalan.
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)

' Versi baru: native\pengawas.exe juga menangkap Teknik Oda yang dibuka lagi dari tray. Bila ada, serahkan ke sana.
exe = dir & "\native\pengawas.exe"
If fso.FileExists(exe) Then
  sh.Run """" & exe & """", 0, False
  WScript.Quit
End If

Set wmi = GetObject("winmgmts:\\.\root\cimv2")

' Cukup satu pengawas yang berjalan
me_ = LCase(WScript.ScriptFullName)
n = 0
For Each p In wmi.ExecQuery("SELECT CommandLine FROM Win32_Process WHERE Name='wscript.exe' OR Name='cscript.exe'")
  If Not IsNull(p.CommandLine) Then
    If InStr(LCase(p.CommandLine), me_) > 0 Then n = n + 1
  End If
Next
If n > 1 Then WScript.Quit

Set ev = wmi.ExecNotificationQuery("SELECT * FROM __InstanceCreationEvent WITHIN 2 WHERE TargetInstance ISA 'Win32_Process' AND TargetInstance.Name = 'TeknikOda.exe'")
Do
  Set e = ev.NextEvent
  WScript.Sleep 1500
  ' Lewati bila Teknik Oda baru saja dibuka oleh peluncur Asisten sendiri
  mark = dir & "\data\oda-dibuka-asisten.txt"
  skip = False
  If fso.FileExists(mark) Then
    If DateDiff("s", fso.GetFile(mark).DateLastModified, Now) < 60 Then skip = True
  End If
  If Not skip Then
    ' cari peluncur versi apa pun ("Asisten FM27*.vbs"), ambil yang terbaru
    launcher = "": newest = 0
    For Each f In fso.GetFolder(dir).Files
      If LCase(Left(f.Name, 12)) = "asisten fm27" And LCase(fso.GetExtensionName(f.Name)) = "vbs" Then
        If launcher = "" Or f.DateLastModified > newest Then launcher = f.Path: newest = f.DateLastModified
      End If
    Next
    If launcher <> "" Then sh.Run "wscript.exe """ & launcher & """", 0, False
  End If
Loop
