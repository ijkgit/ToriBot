import { SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("재생")
    .setDescription("🐿️ 도토리로 노래를 틀어줘요!")
    .addStringOption((option) =>
      option
        .setName("노래")
        .setDescription("유튜브 노래 제목 또는 URL")
        .setRequired(true),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("정지")
    .setDescription("🐿️ 재생을 멈춰요!")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("가사")
    .setDescription("🐿️ 현재 재생 중인 노래의 가사를 보여줘요!")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("현재곡")
    .setDescription("🐿️ 현재 재생 중인 노래 정보를 보여줘요!")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("큐")
    .setDescription("🐿️ 재생 대기 목록을 보여줘요!")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("스킵")
    .setDescription("🐿️ 다음 곡으로 넘어가요!")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("자동재생")
    .setDescription("🐿️ 자동재생을 켜거나 꺼요!")
    .addBooleanOption((option) =>
      option
        .setName("활성화")
        .setDescription("자동재생 켜기/끄기")
        .setRequired(true),
    )
    .toJSON(),
];
