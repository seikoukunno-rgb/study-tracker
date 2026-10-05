export type DrivePdf = { id: string; name: string; createdTime?: string };
type PickerResult = { action: string; docs?: { id: string; name: string; mimeType?: string }[] };
type PickerView = { setMimeTypes(value: string): PickerView; setMode(value: string): PickerView };
type Picker = { setVisible(visible: boolean): void; dispose(): void };
type PickerBuilder = {
  addView(view: PickerView): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setAppId(id: string): PickerBuilder;
  setOrigin(origin: string): PickerBuilder;
  setTitle(title: string): PickerBuilder;
  enableFeature(feature: string): PickerBuilder;
  setCallback(callback: (result: PickerResult) => void): PickerBuilder;
  build(): Picker;
};
type PickerApi = {
  DocsView: new (id: string) => PickerView;
  PickerBuilder: new () => PickerBuilder;
  ViewId: { DOCS: string }; DocsViewMode: { LIST: string };
  Feature: { MULTISELECT_ENABLED: string }; Action: { PICKED: string; CANCEL: string };
};

type GoogleWindow = Window & {
  gapi?: { load(name: string, options: { callback: () => void; onerror: () => void; timeout: number; ontimeout: () => void }): void };
  google?: { picker?: PickerApi };
};
let libraryPromise: Promise<PickerApi> | undefined;
function loadPicker() {
  if (libraryPromise) return libraryPromise;
  libraryPromise = new Promise<PickerApi>((resolve, reject) => {
    const win = window as GoogleWindow;
    const fail = () => reject(new Error('Google Pickerを読み込めません。通信状況を確認して再試行してください。'));
    const load = () => win.gapi?.load('picker', {
      callback: () => win.google?.picker ? resolve(win.google.picker) : fail(),
      onerror: fail, timeout: 15000, ontimeout: fail,
    });
    if (win.gapi) { load(); return; }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    const timer = window.setTimeout(fail, 15000);
    script.onload = () => { window.clearTimeout(timer); load(); };
    script.onerror = () => { window.clearTimeout(timer); fail(); };
    document.head.appendChild(script);
  }).catch(error => { libraryPromise = undefined; throw error; });
  return libraryPromise;
}

export async function selectDrivePdfs(accountId: string, email: string): Promise<DrivePdf[]> {
  const api = await loadPicker();
  const response = await fetch('/api/google-drive/picker', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId }), cache: 'no-store',
  });
  const config = await response.json();
  if (!response.ok) throw new Error(config.error || 'Google Pickerを開けません。');
  return new Promise((resolve, reject) => {
    const view = new api.DocsView(api.ViewId.DOCS).setMimeTypes('application/pdf').setMode(api.DocsViewMode.LIST);
    const picker = new api.PickerBuilder().addView(view)
      .setOAuthToken(config.accessToken).setDeveloperKey(config.apiKey).setAppId(config.appId)
      .setOrigin(window.location.origin).setTitle(`${email} のPDFを選択`)
      .enableFeature(api.Feature.MULTISELECT_ENABLED)
      .setCallback(result => {
        if (result.action === api.Action.CANCEL) { picker.dispose(); resolve([]); }
        if (result.action === api.Action.PICKED) {
          picker.dispose();
          const docs = result.docs ?? [];
          if (docs.some(doc => doc.mimeType !== 'application/pdf')) { reject(new Error('PDFファイルを選択してください。')); return; }
          resolve(docs.map(doc => ({ id: doc.id, name: doc.name })));
        }
      }).build();
    picker.setVisible(true);
  });
}
