async function CSVLoader(url) {
  const response = await fetch(url);

  const blob = await response.blob();

  // 从URL中提取文件名
  const fileName = url.match(/\/?([^/]+)$/)?.[1];
  
  // 创建File对象
  const file = new File([blob], fileName, {
    type: 'text/csv', // blob.type
    lastModified: new Date().getTime()
  });

  // 返回File对象
  return file;
}

export { CSVLoader };