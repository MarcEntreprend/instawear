// src\api\storageApi.ts

import { supabase } from "../lib/supabaseClient";

export const storageApi = {
  /**
   * Upload un fichier vers le bucket Supabase et retourne l'URL publique.
   * @param file Le fichier à uploader.
   * @param folder Sous-dossier optionnel (ex: "products").
   * @returns L'URL publique du fichier uploadé.
   */
  async uploadImage(file: File, folder: string = "products"): Promise<string> {
    const fileName = `${folder}/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  },

  /**
   * Upload un fichier pour un ticket support vers le bucket Supabase.
   * @param file Le fichier à uploader.
   * @returns L'URL publique du fichier uploadé.
   */
  async uploadTicketAttachment(file: File): Promise<string> {
    const fileName = `tickets/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  },
};
