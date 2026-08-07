package api

import (
	"bytes"
	"compress/gzip"
	"testing"
)

func TestDecodeUpstreamErrorBodyGzipJSON(t *testing.T) {
	var buf bytes.Buffer
	zw := gzip.NewWriter(&buf)
	_, _ = zw.Write([]byte(`{"error":{"message":"Rate limit exceeded","type":"rate_limit"}}`))
	_ = zw.Close()

	got := decodeUpstreamErrorBody(buf.Bytes())
	if got != "Rate limit exceeded" {
		t.Fatalf("got %q", got)
	}
}

func TestDecodeUpstreamErrorBodyPlainJSON(t *testing.T) {
	got := decodeUpstreamErrorBody([]byte(`{"error":{"message":"invalid api key"}}`))
	if got != "invalid api key" {
		t.Fatalf("got %q", got)
	}
}

func TestDecodeUpstreamErrorBodyBinaryGarbage(t *testing.T) {
	raw := []byte{0x1f, 0x8b, 0x08, 0x00, 0xff, 0xfe, 0x00, 0x01, 0x02, 0x03}
	got := decodeUpstreamErrorBody(raw)
	if got == "" || bytes.Contains([]byte(got), []byte{0x1f, 0x8b}) {
		t.Fatalf("should not leak gzip bytes: %q", got)
	}
}
