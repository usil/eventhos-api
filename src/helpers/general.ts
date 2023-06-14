export const paginator = (arrayToPaginate: any[], pageSize = 2) => {
  if (pageSize === 0) {
    return {
      content: arrayToPaginate,
      pagination: {
        totalElements: arrayToPaginate.length,
        totalPages: 1,
        page: 0,
        pageSize,
      },
    };
  }
  const pages = arrayToPaginate.reduce((acc, val, i) => {
    const idx = Math.floor(i / pageSize);
    const page = acc[idx] || (acc[idx] = []);
    page.push(val);
    return acc;
  }, []) as any[];
  return {
    content: pages,
    pagination: {
      totalElements: arrayToPaginate.length,
      totalPages: pages.length,
      page: 0,
      pageSize,
    },
  };
};

export const stringObfuscate = (rawSensibleParams: any, text: string) => {
  if (!rawSensibleParams || !text) {
      return text
  }
  rawSensibleParams = rawSensibleParams.replace(/\s+/g, '');
  const regex = /(([a-zA-Z0-9\s\_\-])+(?=\,))/g;
  rawSensibleParams = rawSensibleParams.concat(',');
  let paramsArr = rawSensibleParams.match(regex);
  paramsArr?.map((param: string) => {
      let currentRegex =new RegExp(`(?<=` + param + `=)([a-zA-Z0-9]+\s*)+[^&]+`, 'g');
      text = text.replace(currentRegex, '****');
  })
  return text;
}

export const objectObfuscate = (rawSensibleParams: any, object: Record<string, any>) => {
  if (!rawSensibleParams || !object || typeof object !== "object") {
      return object;
  }
  rawSensibleParams = rawSensibleParams.replace(/\s+/g, '');
  const regex = /(([a-zA-Z0-9\s\_\-])+(?=\,))/g;
  rawSensibleParams = rawSensibleParams.concat(',');
  let paramsArr = rawSensibleParams.match(regex);
  const keysArr = Object.keys(object);
  paramsArr?.map((param: string) => {
      if (keysArr.includes(param)) {
          object[param] = "****";
      }
  });
  return object;
}