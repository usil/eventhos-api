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
