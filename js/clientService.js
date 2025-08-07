export async function fetchDataset(resource_id, limit = 100) {
  const url = `https://data.acehprov.go.id/api/3/action/datastore_search?resource_id=${resource_id}&limit=${limit}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    return json.result.records;
  } catch (err) {
    console.error("Gagal mengambil data:", err);
    return [];
  }
}
