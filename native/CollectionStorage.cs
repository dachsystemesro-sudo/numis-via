using System;
using System.IO;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Principal;
using Microsoft.Win32.SafeHandles;
using System.Windows.Forms;
using System.Web.Script.Serialization;

// Standalone native storage provider. No PowerShell interpreter or policy changes.
// New objects only: no SetFileSecurity, SetAccessControl, deletion or ownership repair.
public static class NativeStorage {
 [StructLayout(LayoutKind.Sequential)] struct SA { public int length; public IntPtr descriptor; public int inherit; }
 [StructLayout(LayoutKind.Sequential)] struct Info { public uint attr; public System.Runtime.InteropServices.ComTypes.FILETIME c,a,w; public uint volume,high,low,links,indexHigh,indexLow; }
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateDirectoryW(string p,ref SA sa);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern SafeFileHandle CreateFileW(string p,uint access,uint share,ref SA sa,uint disposition,uint flags,IntPtr template);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetFileInformationByHandle(SafeFileHandle h,out Info i);
 static readonly SecurityIdentifier User=WindowsIdentity.GetCurrent().User;
 static void Need(bool ok,string code) { if(!ok)throw new InvalidOperationException(code); }
 static bool Under(string p,string root) { return p.Equals(root,StringComparison.OrdinalIgnoreCase)||p.StartsWith(root.TrimEnd('\\')+"\\",StringComparison.OrdinalIgnoreCase); }
 static string Local(string p) {
  Need(!String.IsNullOrEmpty(p)&&p.Length>=3&&Char.IsLetter(p[0])&&p[1]==':'&&p[2]=='\\'&&p.Substring(2).IndexOf(':')<0,"absolute_local_path_required");
  string f=Path.GetFullPath(p); Need(f.Length<240,"path_too_long");
  foreach(string part in f.Substring(3).Split('\\')) { Need(part.Length>0&&part!="."&&part!=".."&&!part.EndsWith(".")&&!part.EndsWith(" "),"ambiguous_path"); }
  DriveInfo d=new DriveInfo(Path.GetPathRoot(f)); Need(d.DriveType==DriveType.Fixed&&d.DriveFormat=="NTFS","local_ntfs_required");
  foreach(string key in new string[]{"OneDrive","OneDriveCommercial","OneDriveConsumer"}) { string s=Environment.GetEnvironmentVariable(key); if(!String.IsNullOrEmpty(s))Need(!Under(f,Path.GetFullPath(s)),"synced_storage_forbidden"); }
  return f;
 }
 // Keep every existing ancestor open without FILE_SHARE_DELETE during operations.
 static List<SafeFileHandle> LockPath(string f,bool missingLeaf) {
  var held=new List<SafeFileHandle>();
  try {
   string cursor=Path.GetPathRoot(f); var paths=new List<string>();paths.Add(cursor);
   foreach(string part in f.Substring(3).Split('\\')){cursor=Path.Combine(cursor,part);paths.Add(cursor);}
   foreach(string p in paths) {
    if(missingLeaf&&p==f&&!Directory.Exists(p)&&!File.Exists(p))break;
    SA empty=new SA(); var h=CreateFileW(p,0,3,ref empty,3,0x02200000,IntPtr.Zero);
    if(h.IsInvalid){h.Dispose();throw new InvalidOperationException("path_open_failed");}
    held.Add(h); Info info; Need(GetFileInformationByHandle(h,out info),"path_information_failed");
    Need((info.attr&(0x400u|0x1000u|0x40000u|0x400000u))==0,"reparse_or_offline_forbidden");
    if((info.attr&16)==0)Need(info.links==1,"hardlink_forbidden");
   } return held;
  } catch { foreach(var h in held)h.Dispose();throw; }
 }
 static void Release(List<SafeFileHandle> held){foreach(var h in held)h.Dispose();}
 static void CheckAcl(string f,bool protectedRoot) {
  bool dir=Directory.Exists(f); FileSystemSecurity acl=dir?(FileSystemSecurity)Directory.GetAccessControl(f,AccessControlSections.Owner|AccessControlSections.Access):File.GetAccessControl(f,AccessControlSections.Owner|AccessControlSections.Access);
  Need(acl.GetOwner(typeof(SecurityIdentifier)).Equals(User),"owner_mismatch");
  Need(!protectedRoot||acl.AreAccessRulesProtected,"protected_acl_required");
  var rules=acl.GetAccessRules(true,true,typeof(SecurityIdentifier)); Need(rules.Count>0,"empty_acl"); bool full=false;
  foreach(FileSystemAccessRule r in rules){
   string sid=r.IdentityReference.Value;
   Need(r.AccessControlType==AccessControlType.Allow&&(sid==User.Value||sid=="S-1-5-18")&&(r.PropagationFlags&PropagationFlags.InheritOnly)==0,"untrusted_acl");
   if(sid==User.Value&&(r.FileSystemRights&FileSystemRights.FullControl)==FileSystemRights.FullControl)full=true;
   if(dir)Need((r.InheritanceFlags&(InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit))==(InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit),"private_inheritance_required");
  } Need(full,"owner_access_missing");
 }
 public static void Check(string input,bool root){string f=Local(input);var held=LockPath(f,false);try{CheckAcl(f,root);}finally{Release(held);}}
 static byte[] Descriptor(bool dir) {
  string sddl="O:"+User.Value+"D:P(A;"+(dir?"OICI":"")+";FA;;;"+User.Value+")(A;"+(dir?"OICI":"")+";FA;;;SY)";
  var sd=new RawSecurityDescriptor(sddl);byte[] b=new byte[sd.BinaryLength];sd.GetBinaryForm(b,0);return b;
 }
 public static void NewObject(string input,byte[] content,bool child) {
  string f=Local(input),parent=Path.GetDirectoryName(f);Need(Directory.Exists(parent),"parent_required");
  var held=LockPath(f,true);
  try {
   Need(!Directory.Exists(f)&&!File.Exists(f),"new_empty_target_required");
   if(child)CheckAcl(parent,false);
   byte[] descriptor=Descriptor(content==null);IntPtr mem=Marshal.AllocHGlobal(descriptor.Length);
   try {
    Marshal.Copy(descriptor,0,mem,descriptor.Length);SA sa=new SA();sa.length=Marshal.SizeOf(typeof(SA));sa.descriptor=mem;
    if(content==null)Need(CreateDirectoryW(f,ref sa),"exclusive_directory_creation_failed");
    else {
     using(var handle=CreateFileW(f,0x40000000,0,ref sa,1,0x80,IntPtr.Zero)) {
      Need(!handle.IsInvalid,"exclusive_file_creation_failed");using(var stream=new FileStream(handle,FileAccess.Write)){stream.Write(content,0,content.Length);stream.Flush(true);}
     }
    }
   }finally{Marshal.FreeHGlobal(mem);}
   Check(f,content==null);
  }finally{Release(held);}
 }
 [STAThread] static int Main(string[] args) {
  try {
   if(args.Length==1&&args[0]=="select-photos") {
    using(var dialog=new OpenFileDialog()) {
     dialog.Title="NUMIS VIA - 1 az 30 fotografii tej istej mince";
     dialog.InitialDirectory=Environment.GetFolderPath(Environment.SpecialFolder.MyPictures);
     dialog.Filter="Fotografie|*.jpg;*.jpeg;*.png;*.webp";dialog.Multiselect=true;
     dialog.FileOk += delegate(object sender, System.ComponentModel.CancelEventArgs e) {
      if(dialog.FileNames.Length<1||dialog.FileNames.Length>30){e.Cancel=true;MessageBox.Show("Vyberte 1 az 30 fotografii jednej mince.", "NUMIS VIA",MessageBoxButtons.OK,MessageBoxIcon.Information);}
     };
     Need(dialog.ShowDialog()==DialogResult.OK,"selection_cancelled");Need(dialog.FileNames.Length>=1&&dialog.FileNames.Length<=30,"select_one_to_thirty_photos");
     foreach(string p in dialog.FileNames){var held=LockPath(Local(p),false);Release(held);}
     Console.WriteLine(new JavaScriptSerializer().Serialize(dialog.FileNames));return 0;
    }
   }
   if(args.Length==1&&args[0]=="collection-menu") {
    var serializer=new JavaScriptSerializer();var data=serializer.Deserialize<Dictionary<string,object>>(Console.In.ReadToEnd());
    var ids=new List<string>();var form=new Form();form.Text="NUMIS VIA - Private Collection Archive";form.Width=720;form.Height=380;form.StartPosition=FormStartPosition.CenterScreen;
    var label=new Label();label.Left=20;label.Top=15;label.Width=660;label.Height=55;label.Text="Sukromny lokalny archiv. Identita nepotvrdena, ocenenie blokovane.\n"+Convert.ToString(data["summary"]);form.Controls.Add(label);
    var list=new ListBox();list.Left=20;list.Top=80;list.Width=660;list.Height=120;form.Controls.Add(list);
    var coinData=new List<Dictionary<string,object>>();
    foreach(var raw in (System.Collections.IEnumerable)data["coins"]){var coin=(Dictionary<string,object>)raw;coinData.Add(coin);ids.Add(Convert.ToString(coin["coin_id"]));list.Items.Add(Convert.ToString(coin["title"])+" | "+Convert.ToString(coin["coin_id"])+" | "+Convert.ToString(coin["photos"])+" foto");}
    if(list.Items.Count>0)list.SelectedIndex=0;
    Dictionary<string,object> result=new Dictionary<string,object>();result["action"]="exit";
    string[] actions={"add","photos","proposal","index","exit"};string[] labels={"Pridat mincu","Doplnit fotografie","Predbezna karta","Otvorit index","Zavriet"};
    for(int i=0;i<actions.Length;i++){
     string action=actions[i];var button=new Button();button.Left=20+i*133;button.Top=225;button.Width=125;button.Height=45;button.Text=labels[i];form.Controls.Add(button);
     button.Click+=delegate {
      if((action=="photos"||action=="proposal")&&list.SelectedIndex<0){MessageBox.Show("Najprv vyberte mincu zo zoznamu.");return;}
      result["action"]=action;if(list.SelectedIndex>=0)result["coin_id"]=ids[list.SelectedIndex];
      if(action=="proposal"){
       var edit=new Form();edit.Text="Iba predbezny navrh - identita zostava null";edit.Width=540;edit.Height=390;edit.StartPosition=FormStartPosition.CenterParent;
       string[] keys={"title","country","denomination","year","notes"};string[] captions={"Nazov karty","Navrh krajiny","Navrh nominalu","Navrh roka","Poznamka"};var boxes=new TextBox[5];
       for(int k=0;k<5;k++){var l=new Label();l.Left=15;l.Top=20+k*50;l.Width=145;l.Text=captions[k];edit.Controls.Add(l);boxes[k]=new TextBox();boxes[k].Left=165;boxes[k].Top=15+k*50;boxes[k].Width=330;boxes[k].MaxLength=k==0?200:500;edit.Controls.Add(boxes[k]);}
       var selected=coinData[list.SelectedIndex];boxes[0].Text=Convert.ToString(selected["title"]);boxes[4].Text=Convert.ToString(selected["notes"]);
       var proposal=selected["identity_proposal"] as Dictionary<string,object>;
       if(proposal!=null)for(int k=1;k<=3;k++)if(proposal.ContainsKey(keys[k]))boxes[k].Text=Convert.ToString(proposal[keys[k]]);
       var ok=new Button();ok.Text="Ulozit navrh";ok.Left=165;ok.Top=280;ok.DialogResult=DialogResult.OK;edit.Controls.Add(ok);edit.AcceptButton=ok;
       if(edit.ShowDialog(form)!=DialogResult.OK)return;
       for(int k=0;k<5;k++)result[keys[k]]=boxes[k].Text;
      }
      form.Close();
     };
    }
    Application.Run(form);Console.WriteLine(serializer.Serialize(result));return 0;
   }
   Need(args.Length>=2,"usage_mode_and_absolute_path");
   if(args[0]=="check") {Need(args.Length==2||args.Length==3&&args[2]=="protected","invalid_arguments");Check(args[1],args.Length==3);}
   else if(args[0]=="check-source"){Need(args.Length==2,"invalid_arguments");var held=LockPath(Local(args[1]),false);Release(held);}
   else if(args[0]=="create-root"){Need(args.Length==2,"invalid_arguments");NewObject(args[1],null,false);}
   else if(args[0]=="create-dir"){Need(args.Length==2,"invalid_arguments");NewObject(args[1],null,true);}
   else if(args[0]=="write-new"){Need(args.Length==2,"invalid_arguments");string text=Console.In.ReadToEnd();Need(text.Length<=20000000,"payload_limit");NewObject(args[1],Convert.FromBase64String(text),true);}
   else if(args[0]=="preflight"){Need(args.Length==2,"invalid_arguments");string f=Local(args[1]);Need(Directory.Exists(Path.GetDirectoryName(f)),"parent_required");var held=LockPath(f,true);try{Need(!Directory.Exists(f)&&!File.Exists(f),"new_empty_target_required");}finally{Release(held);}}
   else throw new InvalidOperationException("unknown_mode");
   Console.WriteLine("{\"valid\":true,\"platform\":\"windows_ntfs_native\",\"identity\":null,\"valuation_allowed\":false,\"ready_for_physical_pilot\":false}");return 0;
  }catch(Exception e){string code=e is InvalidOperationException?e.Message:"native_storage_failed";Console.WriteLine("{\"valid\":false,\"error\":\""+code+"\",\"identity\":null,\"valuation_allowed\":false,\"ready_for_physical_pilot\":false}");return 1;}
 }
}
