class EmbeddingService:
    dimensions = 1536

    async def embed(self, text: str) -> list[float]:
        seed = sum(ord(char) for char in text)
        return [((seed + index * 31) % 1000) / 1000 for index in range(self.dimensions)]


embedding_service = EmbeddingService()
