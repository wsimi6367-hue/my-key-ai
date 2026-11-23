// Relais My Key AI : reçoit les messages de l'appli et les transmet à l'assistant (n8n).
// Sert quand un wifi bloque l'adresse de n8n : les adresses Google sont rarement bloquées.
// Déployé dans le projet Apps Script « My Key AI relais » (Application Web, exécuté en tant que propriétaire, accès : tout le monde).
var N8N_URL = 'https://appn8ncloud81.app.n8n.cloud/webhook/mykey-chat';

function doPost(e) {
  var body = (e && e.postData && e.postData.contents) || '{}';
  try {
    var res = UrlFetchApp.fetch(N8N_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: body,
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    if (code >= 200 && code < 300) return sortie(res.getContentText());
    return sortie(JSON.stringify({ error: 'assistant', status: code }));
  } catch (err) {
    return sortie(JSON.stringify({ error: 'relais', message: String(err) }));
  }
}

function doGet() {
  return sortie(JSON.stringify({ ok: true, service: 'My Key AI relais' }));
}

function sortie(texte) {
  return ContentService.createTextOutput(texte).setMimeType(ContentService.MimeType.JSON);
}
