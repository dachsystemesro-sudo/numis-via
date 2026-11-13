param(
  [ValidateSet('Create','Check','ClaimNew')][string]$Mode,
  [Parameter(Mandatory=$true)][string]$TargetPath,
  [switch]$RequireProtected
)
$ErrorActionPreference = 'Stop'
$stage = 'path'
try {
  $full = [IO.Path]::GetFullPath($TargetPath)
  if ($full -notmatch '^[A-Za-z]:\\' -or $full.Substring(2).Contains(':')) { throw 'local_ntfs_required' }
  $drive = New-Object IO.DriveInfo ([IO.Path]::GetPathRoot($full))
  $stage = 'drive'
  if ($drive.DriveType -ne 'Fixed' -or $drive.DriveFormat -ne 'NTFS') { throw 'local_ntfs_required' }
  foreach ($sync in @($env:OneDrive,$env:OneDriveCommercial,$env:OneDriveConsumer)) {
    if ($sync -and ($full.Equals($sync,[StringComparison]::OrdinalIgnoreCase) -or $full.StartsWith($sync.TrimEnd([char]92)+'\',[StringComparison]::OrdinalIgnoreCase))) { throw 'synced_storage_forbidden' }
  }
  $cursor = $full
  $stage = 'parents'
  while ($cursor) {
    if (Test-Path -LiteralPath $cursor) {
      $item = Get-Item -LiteralPath $cursor -Force
      if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'reparse_point_forbidden' }
    }
    $parent = [IO.Path]::GetDirectoryName($cursor.TrimEnd([char]92))
    if ($parent -eq $cursor) { break }; $cursor = $parent
  }
  $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
  if ($Mode -eq 'Create') {
    $stage = 'create'
    # Only a brand-new leaf. No permissions of an existing path are modified.
    if (Test-Path -LiteralPath $full) { throw 'new_empty_vault_required' }
    if (-not (Test-Path -LiteralPath ([IO.Path]::GetDirectoryName($full)) -PathType Container)) { throw 'parent_required' }
    $acl = New-Object Security.AccessControl.DirectorySecurity
    $acl.SetOwner($sid)
    $acl.SetAccessRuleProtection($true,$false)
    foreach ($allowed in @($sid,(New-Object Security.Principal.SecurityIdentifier 'S-1-5-18'))) {
      $rule = New-Object Security.AccessControl.FileSystemAccessRule($allowed,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
      $acl.AddAccessRule($rule)
    }
    # CREATE_NEW directory semantics, even if another process wins the race:
    # never change the ACL of an existing path.
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class NumisPrivateDirectory {
  [StructLayout(LayoutKind.Sequential)]
  public struct SecurityAttributes { public int length; public IntPtr descriptor; public int inherit; }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool CreateDirectoryW(string path, ref SecurityAttributes attributes);
}
'@
    $binary = $acl.GetSecurityDescriptorBinaryForm()
    $memory = [Runtime.InteropServices.Marshal]::AllocHGlobal($binary.Length)
    try {
      [Runtime.InteropServices.Marshal]::Copy($binary,0,$memory,$binary.Length)
      $attributes = New-Object NumisPrivateDirectory+SecurityAttributes
      $attributes.length = [Runtime.InteropServices.Marshal]::SizeOf($attributes)
      $attributes.descriptor = $memory
      $attributes.inherit = 0
      if (-not [NumisPrivateDirectory]::CreateDirectoryW($full,[ref]$attributes)) { throw 'new_private_directory_creation_failed' }
    } finally { [Runtime.InteropServices.Marshal]::FreeHGlobal($memory) }
    $RequireProtected = $true
  }
  $item = Get-Item -LiteralPath $full -Force
  $stage = 'acl'
  # Query only owner and discretionary access, not group/audit sections. This
  # does not require privileged SACL access or localized account translation.
  $acl = $item.GetAccessControl(([Security.AccessControl.AccessControlSections]::Owner -bor [Security.AccessControl.AccessControlSections]::Access))
  $stage = 'owner'
  if ($RequireProtected -and -not $acl.AreAccessRulesProtected) { throw 'protected_acl_required' }
  $rules = @($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
  if ($rules.Count -eq 0) { throw 'empty_acl' }
  $ownerFull = $false
  $stage = 'rules'
  foreach ($rule in $rules) {
    if ($rule.AccessControlType -ne 'Allow' -or $rule.IdentityReference.Value -notin @($sid.Value,'S-1-5-18') -or ($rule.PropagationFlags -band [Security.AccessControl.PropagationFlags]::InheritOnly)) { throw 'untrusted_acl' }
    if ($rule.IdentityReference.Value -eq $sid.Value -and (($rule.FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -eq [Security.AccessControl.FileSystemRights]::FullControl)) { $ownerFull = $true }
    if ($item.PSIsContainer -and (($rule.InheritanceFlags -band [Security.AccessControl.InheritanceFlags]::ContainerInherit) -eq 0 -or ($rule.InheritanceFlags -band [Security.AccessControl.InheritanceFlags]::ObjectInherit) -eq 0)) { throw 'private_inheritance_required' }
  }
  if (-not $ownerFull) { throw 'owner_access_missing' }
  if ($Mode -eq 'Create' -or $Mode -eq 'ClaimNew') {
    # Called only immediately after an exclusive create by the JS tool. An
    # elevated Windows token may otherwise assign Administrators as owner.
    # DACL was checked first and is preserved. Never used by read/check paths.
    $stage = 'new_owner'
    $acl.SetOwner($sid)
    $item.SetAccessControl($acl)
    $acl = $item.GetAccessControl([Security.AccessControl.AccessControlSections]::Owner)
  }
  $stage = 'owner'
  if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value) { throw 'owner_mismatch' }
  @{valid=$true;platform='windows_ntfs_acl'} | ConvertTo-Json -Compress
} catch {
  # No paths, account names, SIDs, ACL contents or caught OS messages in logs.
  @{valid=$false;error='windows_private_storage_unverified';stage=$stage;line=[int]$_.InvocationInfo.ScriptLineNumber;category=$_.CategoryInfo.Category.ToString();exception_type=$_.Exception.GetType().Name;remediation='USE_NEW_LOCAL_NTFS_VAULT_OR_ASK_ADMIN_TO_REVIEW_ACL'} | ConvertTo-Json -Compress
  exit 1
}
