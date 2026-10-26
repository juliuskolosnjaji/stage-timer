#ifndef MyAppVersion
  #define MyAppVersion "2.7.0"
#endif
#ifndef SourceDir
  #error SourceDir must point to the extracted Windows bundle
#endif
#ifndef OutputDir
  #define OutputDir "."
#endif

[Setup]
AppId={{30E3F5CC-E48D-49F9-B9A0-6F3E36FB1E25}
AppName=Stage Timer
AppVersion={#MyAppVersion}
AppPublisher=Julius Kolosnjaji
AppPublisherURL=https://github.com/juliuskolosnjaji/stage-timer
AppSupportURL=https://github.com/juliuskolosnjaji/stage-timer/issues
AppUpdatesURL=https://github.com/juliuskolosnjaji/stage-timer/releases
DefaultDirName={localappdata}\Programs\Stage Timer
DefaultGroupName=Stage Timer
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename=stage-timer-{#MyAppVersion}-windows-x64-setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
SetupIconFile=..\public\assets\stagetimer.ico
UninstallDisplayIcon={app}\app\public\assets\stagetimer.ico

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Stage Timer"; Filename: "{app}\Start Stage Timer.bat"; WorkingDir: "{app}"; IconFilename: "{app}\app\public\assets\stagetimer.ico"
Name: "{autodesktop}\Stage Timer"; Filename: "{app}\Start Stage Timer.bat"; WorkingDir: "{app}"; IconFilename: "{app}\app\public\assets\stagetimer.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\Start Stage Timer.bat"; Description: "Stage Timer starten"; WorkingDir: "{app}"; Flags: postinstall shellexec skipifsilent nowait
