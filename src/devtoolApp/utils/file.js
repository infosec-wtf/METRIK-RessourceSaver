import * as zip from '@zip.js/zip.js';
import { isValidBase64 } from './encoding';

export const resolveDuplicatedResources = (resourceList = []) => {
  const resolvedListByKey = {};
  const result = [];
  const resourceListUniqByUrl = Object.values(
    resourceList.reduce(
      (list, res) => ({
        ...list,
        ...(!list[res.url] || !list[res.url].content || res.content
          ? {
              [res.url]: res,
            }
          : {}),
      }),
      {}
    )
  );
  resourceListUniqByUrl
    .filter((r) => r && r.saveAs && r.saveAs.path && r.saveAs.name)
    .sort((rA, rB) => rA.saveAs.path.localeCompare(rB.saveAs.path))
    .forEach((r) => {
      resolvedListByKey[r.saveAs.path] = (resolvedListByKey[r.saveAs.path] || []).concat([r]);
    });
  Object.values(resolvedListByKey).forEach((rGroup) => {
    result.push(
      ...(rGroup.length < 2
        ? rGroup
        : rGroup.map((r, rIndex) =>
            rIndex === 0
              ? r
              : {
                  ...r,
                  saveAs: {
                    ...r.saveAs,
                    name: r.saveAs.name.replace(/(\.)(?!.*\.)/g, ` (${rIndex}).`),
                    path: r.saveAs.path.replace(/(\.)(?!.*\.)/g, ` (${rIndex}).`),
                  },
                }
          ))
    );
  });
  return result;
};

export const downloadZipFile = (toDownload, options, eachDoneCallback, callback) => {
  const blobWrite = new zip.BlobWriter('application/zip');
  const zipWriter = new zip.ZipWriter(blobWrite);
  addItemsToZipWriter(
    zipWriter,
    toDownload,
    options,
    eachDoneCallback,
    downloadCompleteZip.bind(this, zipWriter, blobWrite, callback)
  );
};

// Create a reader of the content for zip
export const getContentRead = (item) => {
  if (item.encoding === 'base64' && isValidBase64(item.content)) {
    return new zip.Data64URIReader(item.content);
  }
  if (item.content instanceof Blob) {
    return new zip.BlobReader(item.content);
  }
  return new zip.TextReader(item.content || 'No Content: ' + item.url);
};

export const addItemsToZipWriter = (zipWriter, items, options, eachDoneCallback, callback) => {
  const item = items[0];
  const rest = items.slice(1);

  // if item exist so add it to zip
  if (item) {
    // Base64 content that fails strict validation is not passed to
    // Data64URIReader (see getContentRead); it falls back to TextReader.
    if (item.encoding === 'base64' && !isValidBase64(item.content)) {
      console.log('[DEVTOOL]', item.url, ' is not valid base64 encoding, fallback to text.');
    }

    // Create a reader of the content for zip
    const resolvedContent = getContentRead(item);

    // Item has no content
    const isNoContent = !item.content;
    const ignoreNoContentFile = !!options?.ignoreNoContentFile;
    if (isNoContent && ignoreNoContentFile) {
      // Exclude file as no content
      console.log('[DEVTOOL]', 'EXCLUDED: ', item.url);
      eachDoneCallback(item, true);
      // To the next item
      addItemsToZipWriter(zipWriter, rest, options, eachDoneCallback, callback);
    } else {
      // Make sure the file has some byte otherwise no import to avoid corrupted zip
      if (resolvedContent.size > 0 || resolvedContent['blobReader']?.size > 0) {
        zipWriter.add(item.saveAs.path, resolvedContent).finally(() => {
          eachDoneCallback(item, true);
          addItemsToZipWriter(zipWriter, rest, options, eachDoneCallback, callback);
        });
      } else {
        // If no size, exclude the item
        console.log('[DEVTOOL]', 'EXCLUDED: ', item.url);
        eachDoneCallback(item, false);
        // To the next item
        addItemsToZipWriter(zipWriter, rest, options, eachDoneCallback, callback);
      }
    }
  } else {
    // Callback when all done
    callback();
  }
  return rest;
};

export const downloadCompleteZip = (zipWriter, blobWriter, callback) => {
  zipWriter.close();
  blobWriter.getData().then((blob) => {
    chrome.tabs.get(chrome.devtools.inspectedWindow.tabId, function (tab) {
      let url = new URL(tab.url);
      let filename = url.hostname ? url.hostname.replace(/([^A-Za-z0-9.])/g, '_') : 'all';
      let a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename + '.zip';
      a.click();
      callback();
    });
  });
};
