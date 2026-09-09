CREATE POLICY "fotos leitura aberta" ON storage.objects FOR SELECT USING (bucket_id = 'fotos-materiais');
CREATE POLICY "fotos upload aberto" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fotos-materiais');
CREATE POLICY "fotos update aberto" ON storage.objects FOR UPDATE USING (bucket_id = 'fotos-materiais') WITH CHECK (bucket_id = 'fotos-materiais');
CREATE POLICY "fotos delete aberto" ON storage.objects FOR DELETE USING (bucket_id = 'fotos-materiais');