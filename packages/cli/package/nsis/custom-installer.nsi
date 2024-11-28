!include "winmessages.nsh"

ShowInstDetails show
ShowUninstDetails show

!addplugindir "../../nsis/Plugins/x86-unicode"

!define env_hkcu 'HKCU "Environment"'

Section "@fluencelabs/cli CLI ${VERSION}"
  SetOutPath $INSTDIR
  File /r bin
  File /r client
  ExpandEnvStrings $0 "%COMSPEC%"

  WriteRegStr HKCU "Software\fluence" "" $INSTDIR
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\fluence" \
                   "DisplayName" "@fluencelabs/cli"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\fluence" \
                   "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\fluence" \
                   "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\fluence" \
                   "Publisher" "Cloudless Labs"

  WriteRegExpandStr ${env_hkcu} "FLUENCE_OCLIF_CLIENT_HOME" "$INSTDIR\client"
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000
SectionEnd

Section "Set PATH to @fluencelabs/cli"
  Push $0
  EnVar::AddValue "PATH" "" # Need to call 'EnVar::AddValue' with empty string before the actual write to PATH otherwise junk will be written for unknown reason
  EnVar::AddValue "PATH" "$INSTDIR\bin"
  Pop $0
  DetailPrint "EnVar::AddValue returned=|$0|"
  Pop $0
SectionEnd

Section /o "Add %LOCALAPPDATA%\fluence to Windows Defender exclusions (highly recommended for performance!)"
  ExecShell "" '"$0"' "/C powershell -ExecutionPolicy Bypass -Command $\"& {Add-MpPreference -ExclusionPath $\"$LOCALAPPDATA\fluence$\"}$\" -FFFeatureOff" SW_HIDE
SectionEnd

Section "Uninstall"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"
  RMDir /r "$LOCALAPPDATA\fluence"
  DeleteRegKey /ifempty HKCU "Software\fluence"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\fluence"

  DeleteRegValue ${env_hkcu} "FLUENCE_OCLIF_CLIENT_HOME"
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000
SectionEnd

# TODO: Make a PR to oclif's repo with the proposal to upgrade their codebase

/*
This script patches the default installation script in Oclif's sources.
The open comment symbol is used to exclude all following code from getting to the installer.
Unfortunately oclif's code isn't perfect and contains bugs.
