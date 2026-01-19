const jsonResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const draw = url.searchParams.get("draw");
  if (!draw || !/^\d+$/.test(draw)) {
    return jsonResponse({ error: "invalid_draw" }, 400);
  }

  const apiUrl = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${draw}`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return jsonResponse({ error: "lotto_api_error" }, 502);
    }
    const data = await response.json();
    if (!data || data.returnValue !== "success") {
      return jsonResponse({ error: "draw_not_found" }, 404);
    }

    const numbers = [
      data.drwtNo1,
      data.drwtNo2,
      data.drwtNo3,
      data.drwtNo4,
      data.drwtNo5,
      data.drwtNo6,
    ];

    return jsonResponse({
      draw: data.drwNo,
      date: data.drwNoDate,
      numbers,
      bonus: data.bnusNo,
    });
  } catch (error) {
    return jsonResponse({ error: "unexpected_error" }, 500);
  }
}
