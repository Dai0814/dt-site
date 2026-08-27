Set shell = CreateObject("WScript.Shell")
shell.Run """" & CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\start-site.cmd""", 0, False
