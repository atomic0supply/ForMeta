import { NextResponse } from "next/server";

const VIES_ENDPOINT = "https://ec.europa.eu/taxation_customs/vies/services/checkVatService";

function cleanVat(countryCode: string, vatNumber: string) {
  const country = countryCode.trim().toUpperCase();
  const compact = vatNumber.replace(/[\s.\-]/g, "").toUpperCase();
  return {
    country,
    number: compact.startsWith(country) ? compact.slice(country.length) : compact,
  };
}

function tag(xml: string, name: string): string {
  const match = xml.match(new RegExp(`<(?:\\w+:)?${name}>([\\s\\S]*?)</(?:\\w+:)?${name}>`, "i"));
  return match?.[1]?.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim() ?? "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { countryCode?: string; vatNumber?: string };
    const { country, number } = cleanVat(body.countryCode ?? "", body.vatNumber ?? "");

    if (!/^[A-Z]{2}$/.test(country) || number.length < 2) {
      return NextResponse.json(
        { valid: false, error: "País o VAT no válido" },
        { status: 400 },
      );
    }

    const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>${country}</urn:countryCode>
      <urn:vatNumber>${number}</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(VIES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction: "",
      },
      body: envelope,
      cache: "no-store",
    });

    const xml = await response.text();
    if (!response.ok || xml.includes("<Fault>")) {
      return NextResponse.json({
        valid: false,
        error: tag(xml, "faultstring") || "VIES no disponible",
      }, { status: 502 });
    }

    return NextResponse.json({
      valid: tag(xml, "valid") === "true",
      countryCode: tag(xml, "countryCode"),
      vatNumber: tag(xml, "vatNumber"),
      requestDate: tag(xml, "requestDate"),
      name: tag(xml, "name"),
      address: tag(xml, "address"),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      valid: false,
      error: error instanceof Error ? error.message : "No se pudo validar VIES",
    }, { status: 500 });
  }
}
